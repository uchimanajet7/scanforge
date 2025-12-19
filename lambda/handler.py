import base64
import json
import logging
import math
import os
import re
import socket
from urllib.parse import urljoin, urlparse
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from xml.etree import ElementTree

import barcode
import ipaddress
import numpy as np
import requests
import segno
from barcode.writer import ImageWriter, SVGWriter
from PIL import Image, ImageDraw, ImageChops

try:
    import zxingcpp
except ImportError:
    zxingcpp = None  # type: ignore

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

SUPERSAMPLE = 8  # サブピクセル倍率（アンチエイリアスを抑えつつエッジを太らせる）
MAX_OUTPUT_PIXELS = 2048  # サブピクセル後の最大画像サイズ（長辺上限）
EPS = 1e-9
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(3 * 1024 * 1024)))  # /decode 入力上限（既定 3MB）
BARCODE_URL_MAX_REDIRECTS = 3
ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}


class _BarcodeFetchError(RuntimeError):
    pass


class _BarcodeFetchBadUrl(_BarcodeFetchError):
    pass


class _BarcodeFetchTooLarge(_BarcodeFetchError):
    pass


class _BarcodeFetchUnsupportedFormat(_BarcodeFetchError):
    pass


def _response(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    raw_body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        try:
            raw_body = base64.b64decode(raw_body)
        except Exception:
            return {}
    if isinstance(raw_body, bytes):
        try:
            raw_body = raw_body.decode("utf-8")
        except Exception:
            raw_body = ""
    try:
        return json.loads(raw_body or "{}")
    except json.JSONDecodeError:
        return {}


def _decode_with_zxing(image: Image.Image) -> List[Dict[str, Any]]:
    # PIL 画像を zxingcpp に渡せるよう numpy 配列へ変換
    frame = np.array(image.convert("RGB"))
    results = zxingcpp.read_barcodes(frame)  # type: ignore[attr-defined]
    formatted = []
    for item in results or []:
        formatted.append(
            {
                "format": getattr(item, "format", None).name.lower() if getattr(item, "format", None) else "",
                "text": getattr(item, "text", ""),
            }
        )
    return formatted


def _parse_length(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    cleaned = ""
    for ch in value:
        if ch.isdigit() or ch in ".-":
            cleaned += ch
        else:
            break
    try:
        return float(cleaned)
    except Exception:
        return None


def _parse_numbers(data: str) -> List[float]:
    nums: List[float] = []
    for token in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", data):
        try:
            nums.append(float(token))
        except Exception:
            continue
    return nums


def _matrix_multiply(m1: Tuple[float, float, float, float, float, float], m2: Tuple[float, float, float, float, float, float]) -> Tuple[float, float, float, float, float, float]:
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def _matrix_apply(m: Tuple[float, float, float, float, float, float], x: float, y: float) -> Tuple[float, float]:
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


def _parse_transform(value: Optional[str]) -> Tuple[float, float, float, float, float, float]:
    if not value:
        return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    transform = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    for item in re.finditer(r"(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)", value):
        kind = item.group(1)
        nums = _parse_numbers(item.group(2))
        m = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
        if kind == "matrix" and len(nums) >= 6:
            m = (nums[0], nums[1], nums[2], nums[3], nums[4], nums[5])
        elif kind == "translate":
            tx = nums[0] if len(nums) >= 1 else 0.0
            ty = nums[1] if len(nums) >= 2 else 0.0
            m = (1.0, 0.0, 0.0, 1.0, tx, ty)
        elif kind == "scale":
            sx = nums[0] if len(nums) >= 1 else 1.0
            sy = nums[1] if len(nums) >= 2 else sx
            m = (sx, 0.0, 0.0, sy, 0.0, 0.0)
        elif kind == "rotate":
            angle = nums[0] if len(nums) >= 1 else 0.0
            rad = math.radians(angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)
            if len(nums) >= 3:
                cx = nums[1]
                cy = nums[2]
                m = (cos_a, sin_a, -sin_a, cos_a, cx - cos_a * cx + sin_a * cy, cy - sin_a * cx - cos_a * cy)
            else:
                m = (cos_a, sin_a, -sin_a, cos_a, 0.0, 0.0)
        elif kind == "skewX":
            angle = nums[0] if len(nums) >= 1 else 0.0
            m = (1.0, 0.0, math.tan(math.radians(angle)), 1.0, 0.0, 0.0)
        elif kind == "skewY":
            angle = nums[0] if len(nums) >= 1 else 0.0
            m = (1.0, math.tan(math.radians(angle)), 0.0, 1.0, 0.0, 0.0)
        transform = _matrix_multiply(transform, m)
    return transform


def _compute_viewbox_matrix(width: float, height: float, view_box: Optional[Tuple[float, float, float, float]], preserve: str) -> Tuple[float, float, float, float, float, float]:
    if not view_box:
        return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    vb_x, vb_y, vb_w, vb_h = view_box
    if vb_w == 0 or vb_h == 0:
        return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    align = "xMidYMid"
    meet_or_slice = "meet"
    if preserve:
        parts = preserve.split()
        if parts:
            align = parts[0]
        if len(parts) >= 2:
            meet_or_slice = parts[1]
    sx = width / vb_w
    sy = height / vb_h
    if meet_or_slice == "slice":
        s = max(sx, sy)
    else:
        s = min(sx, sy)
    tx = {
        "xMin": 0.0,
        "xMid": (width - vb_w * s) / 2.0,
        "xMax": width - vb_w * s,
    }
    ty = {
        "YMin": 0.0,
        "YMid": (height - vb_h * s) / 2.0,
        "YMax": height - vb_h * s,
    }
    ax = "xMid"
    ay = "YMid"
    if align.startswith("xMin"):
        ax = "xMin"
    elif align.startswith("xMax"):
        ax = "xMax"
    if "YMin" in align:
        ay = "YMin"
    elif "YMax" in align:
        ay = "YMax"
    return (
        s,
        0.0,
        0.0,
        s,
        tx.get(ax, 0.0) - vb_x * s,
        ty.get(ay, 0.0) - vb_y * s,
    )


def _flatten_cubic(p0: Tuple[float, float], p1: Tuple[float, float], p2: Tuple[float, float], p3: Tuple[float, float], step: float = 0.5) -> List[Tuple[float, float]]:
    # ベジェ長に応じて分割数を決定
    length = (
        math.hypot(p0[0] - p1[0], p0[1] - p1[1])
        + math.hypot(p1[0] - p2[0], p1[1] - p2[1])
        + math.hypot(p2[0] - p3[0], p2[1] - p3[1])
    )
    n = max(1, int(math.ceil(length / step)))
    pts: List[Tuple[float, float]] = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = (
            mt * mt * mt * p0[0]
            + 3 * mt * mt * t * p1[0]
            + 3 * mt * t * t * p2[0]
            + t * t * t * p3[0]
        )
        y = (
            mt * mt * mt * p0[1]
            + 3 * mt * mt * t * p1[1]
            + 3 * mt * t * t * p2[1]
            + t * t * t * p3[1]
        )
        pts.append((x, y))
    return pts


def _flatten_quadratic(p0: Tuple[float, float], p1: Tuple[float, float], p2: Tuple[float, float], step: float = 0.5) -> List[Tuple[float, float]]:
    length = math.hypot(p0[0] - p1[0], p0[1] - p1[1]) + math.hypot(p1[0] - p2[0], p1[1] - p2[1])
    n = max(1, int(math.ceil(length / step)))
    pts: List[Tuple[float, float]] = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
        y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def _arc_to_center(p0: Tuple[float, float], rx: float, ry: float, phi: float, large: int, sweep: int, p1: Tuple[float, float]) -> Tuple[Tuple[float, float], float, float, float, float]:
    # SVG arc を中心形式へ（実装は W3C 推奨手順の簡略版）
    if rx == 0 or ry == 0:
        return (p0, 0, 0, 0, 0)
    phi_rad = math.radians(phi % 360.0)
    cos_phi = math.cos(phi_rad)
    sin_phi = math.sin(phi_rad)
    dx = (p0[0] - p1[0]) / 2.0
    dy = (p0[1] - p1[1]) / 2.0
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy
    rx_sq = rx * rx
    ry_sq = ry * ry
    x1p_sq = x1p * x1p
    y1p_sq = y1p * y1p
    radicand = max(0.0, (rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq) / (rx_sq * y1p_sq + ry_sq * x1p_sq + EPS))
    coef = math.sqrt(radicand)
    if large == sweep:
        coef = -coef
    cxp = coef * (rx * y1p) / ry
    cyp = coef * (-ry * x1p) / rx
    cx = cos_phi * cxp - sin_phi * cyp + (p0[0] + p1[0]) / 2.0
    cy = sin_phi * cxp + cos_phi * cyp + (p0[1] + p1[1]) / 2.0

    def _angle(u: Tuple[float, float], v: Tuple[float, float]) -> float:
        dot = u[0] * v[0] + u[1] * v[1]
        det = u[0] * v[1] - u[1] * v[0]
        ang = math.atan2(det, dot)
        return ang

    v1 = ((x1p - cxp) / rx, (y1p - cyp) / ry)
    v2 = ((-x1p - cxp) / rx, (-y1p - cyp) / ry)
    theta1 = _angle((1, 0), v1)
    delta = _angle(v1, v2)
    if sweep == 0 and delta > 0:
        delta -= 2 * math.pi
    elif sweep == 1 and delta < 0:
        delta += 2 * math.pi
    return ((cx, cy), rx, ry, theta1, delta)


def _arc_to_points(p0: Tuple[float, float], rx: float, ry: float, phi: float, large: int, sweep: int, p1: Tuple[float, float], step_angle: float = math.radians(5.0)) -> List[Tuple[float, float]]:
    center, rx, ry, theta1, delta = _arc_to_center(p0, rx, ry, phi, large, sweep, p1)
    if rx == 0 or ry == 0:
        return [p1]
    n = max(1, int(math.ceil(abs(delta) / step_angle)))
    pts: List[Tuple[float, float]] = []
    for i in range(1, n + 1):
        t = theta1 + delta * (i / n)
        x = center[0] + rx * math.cos(t) * math.cos(math.radians(phi)) - ry * math.sin(t) * math.sin(math.radians(phi))
        y = center[1] + rx * math.cos(t) * math.sin(math.radians(phi)) + ry * math.sin(t) * math.cos(math.radians(phi))
        pts.append((x, y))
    return pts


def _flatten_path(d: str) -> List[Tuple[List[Tuple[float, float]], bool]]:
    tokens = re.findall(r"[MmLlHhVvCcSsQqTtAaZz]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", d)
    it = iter(tokens)
    subpaths: List[Tuple[List[Tuple[float, float]], bool]] = []
    current = (0.0, 0.0)
    start = (0.0, 0.0)
    last_ctrl: Optional[Tuple[float, float]] = None
    mode = None
    while True:
        try:
            token = next(it)
        except StopIteration:
            break
        if re.match(r"[A-Za-z]", token):
            mode = token
            if mode in ("Z", "z"):
                if subpaths and subpaths[-1][0]:
                    pts, _ = subpaths[-1]
                    subpaths[-1] = (pts + [start], True)
                current = start
                last_ctrl = None
            continue
        # number encountered: rewind one step
        nums = [token]
        # helper to get n numbers (including first)
        def take(n: int) -> List[float]:
            vals = [float(nums.pop(0))]
            for _ in range(n - 1):
                vals.append(float(next(it)))
            return vals

        if mode in ("M", "m"):
            x, y = take(2)
            if mode == "m":
                x += current[0]
                y += current[1]
            current = (x, y)
            start = current
            subpaths.append(([current], False))
            last_ctrl = None
            # subsequent implicit L
            mode = "L" if mode == "M" else "l"
        elif mode in ("L", "l"):
            x, y = take(2)
            if mode == "l":
                x += current[0]
                y += current[1]
            current = (x, y)
            subpaths[-1][0].append(current)
            last_ctrl = None
        elif mode in ("H", "h"):
            x = float(nums.pop(0))
            if mode == "h":
                x += current[0]
            current = (x, current[1])
            subpaths[-1][0].append(current)
            last_ctrl = None
        elif mode in ("V", "v"):
            y = float(nums.pop(0))
            if mode == "v":
                y += current[1]
            current = (current[0], y)
            subpaths[-1][0].append(current)
            last_ctrl = None
        elif mode in ("C", "c"):
            x1, y1, x2, y2, x, y = take(6)
            if mode == "c":
                x1 += current[0]
                y1 += current[1]
                x2 += current[0]
                y2 += current[1]
                x += current[0]
                y += current[1]
            pts = _flatten_cubic(current, (x1, y1), (x2, y2), (x, y))
            subpaths[-1][0].extend(pts)
            current = (x, y)
            last_ctrl = (x2, y2)
        elif mode in ("S", "s"):
            x2, y2, x, y = take(4)
            if mode == "s":
                x2 += current[0]
                y2 += current[1]
                x += current[0]
                y += current[1]
            if last_ctrl:
                x1 = 2 * current[0] - last_ctrl[0]
                y1 = 2 * current[1] - last_ctrl[1]
            else:
                x1, y1 = current
            pts = _flatten_cubic(current, (x1, y1), (x2, y2), (x, y))
            subpaths[-1][0].extend(pts)
            current = (x, y)
            last_ctrl = (x2, y2)
        elif mode in ("Q", "q"):
            x1, y1, x, y = take(4)
            if mode == "q":
                x1 += current[0]
                y1 += current[1]
                x += current[0]
                y += current[1]
            pts = _flatten_quadratic(current, (x1, y1), (x, y))
            subpaths[-1][0].extend(pts)
            current = (x, y)
            last_ctrl = (x1, y1)
        elif mode in ("T", "t"):
            x, y = take(2)
            if mode == "t":
                x += current[0]
                y += current[1]
            if last_ctrl:
                x1 = 2 * current[0] - last_ctrl[0]
                y1 = 2 * current[1] - last_ctrl[1]
            else:
                x1, y1 = current
            pts = _flatten_quadratic(current, (x1, y1), (x, y))
            subpaths[-1][0].extend(pts)
            current = (x, y)
            last_ctrl = (x1, y1)
        elif mode in ("A", "a"):
            rx, ry, rot, large, sweep, x, y = take(7)
            if mode == "a":
                x += current[0]
                y += current[1]
            pts = _arc_to_points(current, abs(rx), abs(ry), rot, int(large), int(sweep), (x, y))
            subpaths[-1][0].extend(pts)
            current = (x, y)
            last_ctrl = None
        else:
            last_ctrl = None
    return subpaths


def _render_svg(svg_bytes: bytes) -> Image.Image:
    try:
        root = ElementTree.fromstring(svg_bytes.decode("utf-8", errors="replace"))
    except Exception:
        raise RuntimeError("invalid_svg")

    tag = root.tag.split("}", 1)[-1]
    if tag.lower() != "svg":
        raise RuntimeError("invalid_svg")

    width = _parse_length(root.get("width"))
    height = _parse_length(root.get("height"))

    view_box: Optional[Tuple[float, float, float, float]] = None
    view_box_attr = root.get("viewBox")
    if view_box_attr:
        parts = view_box_attr.strip().replace(",", " ").split()
        if len(parts) >= 4:
            try:
                view_box = (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
            except Exception:
                view_box = None

    if (width is None or height is None) and view_box:
        width = width or view_box[2]
        height = height or view_box[3]

    if width is None or height is None or width <= 0 or height <= 0:
        raise RuntimeError("invalid_svg")

    # viewBox → viewport 変換行列
    vb_matrix = _compute_viewbox_matrix(width, height, view_box, root.get("preserveAspectRatio") or "xMidYMid meet")

    # サブピクセル描画スケール（最大サイズを超える場合は縮小）
    base_scale = SUPERSAMPLE
    shrink = min(1.0, MAX_OUTPUT_PIXELS / max(width * base_scale, height * base_scale, 1.0))
    scale = base_scale * shrink
    canvas_w = max(1, int(math.ceil(width * scale)))
    canvas_h = max(1, int(math.ceil(height * scale)))

    scale_matrix = (scale, 0.0, 0.0, scale, 0.0, 0.0)
    root_matrix = _matrix_multiply(scale_matrix, vb_matrix)

    img = Image.new("RGB", (canvas_w, canvas_h), "white")
    mask_fill = Image.new("1", (canvas_w, canvas_h), 0)
    mask_stroke = Image.new("1", (canvas_w, canvas_h), 0)
    draw_fill = ImageDraw.Draw(mask_fill)
    draw_stroke = ImageDraw.Draw(mask_stroke)

    def apply_transform(points: List[Tuple[float, float]], m: Tuple[float, float, float, float, float, float]) -> List[Tuple[float, float]]:
        return [_matrix_apply(m, x, y) for (x, y) in points]

    def parse_style(elem: ElementTree.Element) -> Dict[str, str]:
        style_map: Dict[str, str] = {}
        style_attr = elem.get("style") or ""
        for chunk in style_attr.split(";"):
            if ":" in chunk:
                k, v = chunk.split(":", 1)
                style_map[k.strip()] = v.strip()
        return style_map

    def resolve_paint(elem: ElementTree.Element, key: str, styles: Dict[str, str]) -> Optional[str]:
        val = elem.get(key) or styles.get(key) or ""
        val = val.strip()
        if not val or val.lower() == "none":
            return None
        return val

    def resolve_float(elem: ElementTree.Element, key: str, styles: Dict[str, str], default: float) -> float:
        val = elem.get(key) or styles.get(key)
        parsed = _parse_length(val) if val is not None else None
        return parsed if parsed is not None else default

    def is_white_paint(color: Optional[str]) -> bool:
        if not color:
            return False
        val = color.strip().lower()
        if val == "white":
            return True
        if val.startswith("#"):
            hex_part = val[1:]
            if len(hex_part) == 3:
                hex_part = "".join(ch * 2 for ch in hex_part)
            return hex_part == "ffffff"
        if val.startswith("rgb(") and val.endswith(")"):
            parts = [p.strip() for p in val[4:-1].split(",")]
            return len(parts) >= 3 and parts[0] == "255" and parts[1] == "255" and parts[2] == "255"
        return False

    def add_fill(polys: List[List[Tuple[float, float]]], fill_rule: str) -> None:
        nonlocal mask_fill
        if fill_rule == "evenodd":
            for poly in polys:
                tmp = Image.new("1", (canvas_w, canvas_h), 0)
                ImageDraw.Draw(tmp).polygon(poly, fill=1)
                mask_fill = ImageChops.logical_xor(mask_fill, tmp)
        else:
            for poly in polys:
                if len(poly) >= 3:
                    draw_fill.polygon(poly, fill=1)

    def add_stroke(lines: List[List[Tuple[float, float]]], stroke_width: float) -> None:
        w = max(1, int(round(stroke_width * scale)))
        for line in lines:
            if len(line) >= 2:
                draw_stroke.line(line, fill=1, width=w)

    for elem in root.iter():
        if elem is root:
            continue
        name = elem.tag.split("}", 1)[-1].lower()
        styles = parse_style(elem)
        fill_rule = (elem.get("fill-rule") or styles.get("fill-rule") or "nonzero").lower()
        fill_attr = elem.get("fill") or styles.get("fill")
        if fill_attr is None or fill_attr.strip() == "":
            fill_color: Optional[str] = "black"
        else:
            fill_color = resolve_paint(elem, "fill", styles)
        stroke_color = resolve_paint(elem, "stroke", styles)
        stroke_width = resolve_float(elem, "stroke-width", styles, 1.0)
        transform = _matrix_multiply(root_matrix, _parse_transform(elem.get("transform")))

        if is_white_paint(fill_color):
            fill_color = None
        if is_white_paint(stroke_color):
            stroke_color = None

        polys: List[List[Tuple[float, float]]] = []
        strokes: List[List[Tuple[float, float]]] = []

        if name == "rect":
            x = _parse_length(elem.get("x")) or 0.0
            y = _parse_length(elem.get("y")) or 0.0
            w = _parse_length(elem.get("width")) or 0.0
            h = _parse_length(elem.get("height")) or 0.0
            if w > 0 and h > 0:
                pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
                polys.append(apply_transform(pts, transform))
                strokes.append(apply_transform([pts[0], pts[1], pts[2], pts[3], pts[0]], transform))
        elif name in ("circle", "ellipse"):
            cx = _parse_length(elem.get("cx")) or 0.0
            cy = _parse_length(elem.get("cy")) or 0.0
            rx = _parse_length(elem.get("r")) if name == "circle" else _parse_length(elem.get("rx"))
            ry = rx if name == "circle" else _parse_length(elem.get("ry"))
            if rx and ry and rx > 0 and ry > 0:
                seg = 32
                pts = []
                for i in range(seg):
                    ang = 2 * math.pi * i / seg
                    pts.append((cx + rx * math.cos(ang), cy + ry * math.sin(ang)))
                polys.append(apply_transform(pts, transform))
                strokes.append(apply_transform(pts + [pts[0]], transform))
        elif name == "line":
            x1 = _parse_length(elem.get("x1")) or 0.0
            y1 = _parse_length(elem.get("y1")) or 0.0
            x2 = _parse_length(elem.get("x2")) or 0.0
            y2 = _parse_length(elem.get("y2")) or 0.0
            strokes.append(apply_transform([(x1, y1), (x2, y2)], transform))
        elif name in ("polyline", "polygon"):
            points_attr = elem.get("points") or ""
            pts_raw: List[Tuple[float, float]] = []
            vals = _parse_numbers(points_attr)
            for i in range(0, len(vals) - 1, 2):
                pts_raw.append((vals[i], vals[i + 1]))
            if pts_raw:
                pts_tr = apply_transform(pts_raw, transform)
                if name == "polygon":
                    polys.append(pts_tr)
                    strokes.append(pts_tr + [pts_tr[0]])
                else:
                    strokes.append(pts_tr)
        elif name == "path":
            d = elem.get("d") or ""
            subpaths = _flatten_path(d)
            for pts_raw, closed in subpaths:
                if not pts_raw:
                    continue
                pts_tr = apply_transform(pts_raw, transform)
                if closed:
                    polys.append(pts_tr)
                strokes.append(pts_tr if not closed else pts_tr + [pts_tr[0]])

        if fill_color and polys:
            add_fill(polys, fill_rule)
        if stroke_color and stroke_width > 0 and strokes:
            add_stroke(strokes, stroke_width)

    # 塗り・線を反映
    if mask_fill.getbbox():
        img.paste("black", mask_fill.convert("L"))
    if mask_stroke.getbbox():
        img.paste("black", mask_stroke.convert("L"))

    return img


def _load_image_base64(value: str) -> Tuple[bytes, str]:
    raw = value.strip()
    content_type = ""
    if raw.startswith("data:"):
        header, _, b64_data = raw.partition(",")
        ct_part = header[5:]  # remove "data:"
        if ";" in ct_part:
            ct_part = ct_part.split(";", 1)[0]
        content_type = ct_part
        raw = b64_data
    try:
        decoded = base64.b64decode(raw, validate=True)
    except Exception as exc:
        raise RuntimeError(f"invalid_base64: {exc}") from exc
    return decoded, content_type


def _is_https_url(url: str) -> bool:
    try:
        p = urlparse(url)
    except Exception:
        return False
    return p.scheme.lower() == "https" and bool(p.netloc)


def _is_public_host(hostname: str) -> bool:
    host = (hostname or "").strip().lower()
    if not host:
        return False
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_global
    except ValueError:  # host が IP 文字列でない場合は DNS 解決で確認する
        pass
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        return False
    for _family, _socktype, _proto, _canonname, sockaddr in infos:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        if not ip.is_global:
            return False
    return True


def _fetch_barcode_url(url: str, max_bytes: int) -> Tuple[bytes, str]:
    current_url = (url or "").strip()
    if not _is_https_url(current_url):
        raise _BarcodeFetchBadUrl("https のみ許可（http/file 等は拒否）")

    for i in range(BARCODE_URL_MAX_REDIRECTS + 1):
        p = urlparse(current_url)
        host = p.hostname or ""
        if not host:
            raise _BarcodeFetchBadUrl("URL が不正です（host が空）")
        if not _is_public_host(host):
            raise _BarcodeFetchBadUrl("URL が不正です（プライベート/特殊アドレスは拒否）")

        try:
            resp = requests.get(
                current_url,
                timeout=5,
                allow_redirects=False,
                stream=True,
                headers={
                    "User-Agent": "scanforge/1.0",
                    "Accept": "image/png,image/jpeg,image/webp,image/svg+xml,application/octet-stream;q=0.8,*/*;q=0.5",
                    "Accept-Encoding": "identity",
                },
            )
        except Exception as exc:
            raise _BarcodeFetchError(f"fetch_failed: {exc}") from exc

        try:
            # リダイレクトは手動追従し、毎回 URL/host を再検証する
            if 300 <= resp.status_code < 400:
                if i >= BARCODE_URL_MAX_REDIRECTS:
                    raise _BarcodeFetchError("too_many_redirects")
                location = (resp.headers.get("Location") or "").strip()
                if not location:
                    raise _BarcodeFetchError("redirect_without_location")
                next_url = urljoin(current_url, location)
                if not _is_https_url(next_url):
                    raise _BarcodeFetchBadUrl("リダイレクト先が https ではありません")
                current_url = next_url
                continue

            resp.raise_for_status()

            content_type = (resp.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
            if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
                raise _BarcodeFetchUnsupportedFormat(f"content_type={content_type or '(empty)'}")

            content_length = (resp.headers.get("Content-Length") or "").strip()
            if content_length.isdigit() and int(content_length) > max_bytes:
                raise _BarcodeFetchTooLarge("content-length exceeds limit")

            total = 0
            chunks: List[bytes] = []
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    raise _BarcodeFetchTooLarge("payload too large")
                chunks.append(chunk)
            return b"".join(chunks), content_type
        finally:
            try:
                resp.close()
            except Exception:
                # close は後始末のみ。失敗しても本処理の結果（成功/例外）を優先する。
                pass

    raise _BarcodeFetchError("too_many_redirects")


def _decode_image(image_bytes: bytes, content_type: str = "", forced_format: Optional[str] = None) -> List[Dict[str, Any]]:
    fmt = (forced_format or "").lower()
    content_type_l = (content_type or "").lower()

    def _as_image() -> Image.Image:
        img = Image.open(BytesIO(image_bytes))
        img.load()
        return img

    if fmt == "svg":
        image = _render_svg(image_bytes)
    else:
        # 未指定なら Content-Type / 先頭タグで SVG 判定
        if fmt == "" and ("image/svg" in content_type_l or image_bytes.lstrip().startswith(b"<svg")):
            image = _render_svg(image_bytes)
        else:
            image = _as_image()

    if zxingcpp is None:
        raise RuntimeError("decode engine is unavailable")

    try:
        return _decode_with_zxing(image)
    except Exception:
        logger.exception("zxingcpp decode failed")
        raise RuntimeError("decode engine is unavailable")


def _handle_decode(payload: Dict[str, Any]) -> Dict[str, Any]:
    barcode_data = payload.get("barcodeData")
    barcode_url = payload.get("barcodeUrl")
    barcode_format = (payload.get("barcodeFormat") or "").lower()

    image_bytes: Optional[bytes] = None
    content_type = ""

    if barcode_format:
        if barcode_format == "jpg":
            barcode_format = "jpeg"
        if barcode_format not in ("svg", "png", "jpeg", "webp"):
            return _response(400, {"message": "unsupported_format", "details": barcode_format})

    if barcode_data:
        if barcode_url:
            logger.warning("barcodeUrl は無視されました（barcodeData を優先）")
        try:
            image_bytes, content_type = _load_image_base64(barcode_data)
        except Exception as exc:
            return _response(400, {"message": "bad_barcode_data", "details": str(exc)})
        if len(image_bytes) > MAX_IMAGE_BYTES:
            return _response(413, {"message": "payload_too_large", "details": f"max_bytes={MAX_IMAGE_BYTES}"})
    elif barcode_url:
        try:
            image_bytes, content_type = _fetch_barcode_url(barcode_url, MAX_IMAGE_BYTES)
        except _BarcodeFetchBadUrl as exc:
            return _response(400, {"message": "bad_barcode_url", "details": str(exc)})
        except _BarcodeFetchUnsupportedFormat as exc:
            return _response(400, {"message": "unsupported_format", "details": str(exc)})
        except _BarcodeFetchTooLarge as exc:
            return _response(413, {"message": "payload_too_large", "details": str(exc)})
        except _BarcodeFetchError as exc:
            return _response(400, {"message": "failed_to_fetch_image", "details": str(exc)})
    else:
        return _response(400, {"message": "barcodeUrl or barcodeData is required"})

    try:
        results = _decode_image(image_bytes, content_type or "", barcode_format or None)
    except RuntimeError as exc:
        return _response(500, {"message": "decode_engine_unavailable", "details": str(exc)})
    except Exception as exc:
        logger.exception("decode failed")
        return _response(500, {"message": "decode_failed", "details": str(exc)})

    return _response(200, {"results": results})


def _encode_qr(text: str, output: str) -> Dict[str, Any]:
    qr = segno.make(text, micro=False)
    buffer = BytesIO()
    if output == "svg":
        # パスではなく矩形ベースの SVG を生成する（QR のセル構造をそのまま表現する）
        matrix = qr.matrix
        rows = len(matrix)
        cols = len(matrix[0]) if rows else 0
        quiet = 4
        width = cols + quiet * 2
        height = rows + quiet * 2
        rects = []
        for y, row in enumerate(matrix):
            for x, cell in enumerate(row):
                if cell:
                    rects.append(
                        f'<rect x="{x + quiet}" y="{y + quiet}" width="1" height="1" fill="black"/>'
                    )
        svg = (
            '<?xml version="1.0" encoding="utf-8"?>'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" shape-rendering="crispEdges">'
            f'<rect width="{width}" height="{height}" fill="white"/>'
            f'{"".join(rects)}</svg>'
        )
        return _response(200, {"format": "svg", "content": svg})

    qr.save(buffer, kind="png")
    return _response(
        200,
        {
            "format": "png",
            "contentBase64": base64.b64encode(buffer.getvalue()).decode("ascii"),
        },
    )


def _encode_code128(text: str, output: str) -> Dict[str, Any]:
    cls = barcode.get_barcode_class("code128")

    if output == "svg":
        writer = SVGWriter()
        buffer = BytesIO()
        instance = cls(text, writer=writer)
        instance.write(buffer)
        return _response(200, {"format": "svg", "content": buffer.getvalue().decode("utf-8")})

    writer = ImageWriter()
    buffer = BytesIO()
    instance = cls(text, writer=writer)
    instance.write(buffer)
    return _response(
        200,
        {
            "format": "png",
            "contentBase64": base64.b64encode(buffer.getvalue()).decode("ascii"),
        },
    )


def _handle_encode(payload: Dict[str, Any]) -> Dict[str, Any]:
    text = payload.get("text")
    if not text:
        return _response(400, {"message": "text is required"})

    fmt = (payload.get("format") or "qrcode").lower()
    output = (payload.get("output") or "png").lower()

    if fmt in ("qr", "qrcode", "qr_code"):
        if output not in ("png", "svg"):
            return _response(400, {"message": "unsupported_output", "details": output})
        return _encode_qr(text, output)

    if fmt != "code128":
        return _response(400, {"message": "unsupported_format", "details": fmt})

    if output not in ("png", "svg"):
        return _response(400, {"message": "unsupported_output", "details": output})

    return _encode_code128(text, output)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    payload = _parse_body(event)
    route_key = event.get("routeKey", "")
    path = event.get("rawPath") or event.get("requestContext", {}).get("http", {}).get("path", "")

    if route_key.endswith("/decode") or path.endswith("/decode"):
        return _handle_decode(payload)

    if route_key.endswith("/encode") or path.endswith("/encode"):
        return _handle_encode(payload)

    return _response(404, {"message": "not_found"})
