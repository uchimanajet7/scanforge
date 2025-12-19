#!/usr/bin/env python3
# ローカルで Lambda ハンドラー（lambda/handler.py）を HTTP API として起動する。
# 目的: /encode /decode をローカルで手早くテスト確認できるようにする。

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, Optional
from urllib.parse import urlparse


def load_lambda_handler(repo_root: Path) -> Callable[[Dict[str, Any], Any], Dict[str, Any]]:
    handler_path = repo_root / "lambda" / "handler.py"
    if not handler_path.is_file():
        raise FileNotFoundError(f"lambda ハンドラーが見つかりません: {handler_path}")

    spec = importlib.util.spec_from_file_location("scanforge_lambda_handler", handler_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("lambda ハンドラーのロードに失敗しました（importlib spec）")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[call-arg]

    handler = getattr(module, "handler", None)
    if handler is None or not callable(handler):
        raise RuntimeError("lambda/handler.py に handler(event, context) が見つかりません。")

    return handler


class ApiHandler(BaseHTTPRequestHandler):
    lambda_handler: Callable[[Dict[str, Any], Any], Dict[str, Any]]

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path or "/"

        try:
            length = int(self.headers.get("content-length", "0") or "0")
        except ValueError:
            self._send_json(400, {"message": "invalid_content_length"})
            return

        raw_body = b""
        if length > 0:
            raw_body = self.rfile.read(length)

        try:
            body_str = raw_body.decode("utf-8")
        except Exception:
            self._send_json(400, {"message": "invalid_body_encoding"})
            return

        event: Dict[str, Any] = {
            "routeKey": f"POST {path}",
            "rawPath": path,
            "body": body_str,
            "isBase64Encoded": False,
            "requestContext": {"http": {"method": "POST", "path": path}},
        }

        try:
            resp = type(self).lambda_handler(event, None)
        except Exception as exc:
            self._send_json(500, {"message": "handler_error", "details": str(exc)})
            return

        status_code = resp.get("statusCode", 200)
        try:
            status = int(status_code)
        except Exception:
            status = 200

        headers = resp.get("headers") or {}
        body = resp.get("body") or ""
        if not isinstance(body, str):
            try:
                body = json.dumps(body, ensure_ascii=False)
            except Exception:
                body = str(body)
        body_bytes = body.encode("utf-8")

        self.send_response(status)
        for k, v in headers.items():
            if k is None or v is None:
                continue
            self.send_header(str(k), str(v))
        self.send_header("content-length", str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def do_GET(self) -> None:  # noqa: N802
        self._send_json(404, {"message": "not_found"})

    def log_message(self, fmt: str, *args: Any) -> None:
        # 既存ログと衝突しないよう、標準エラーへ最小限のアクセスログを出す。
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="ScanForge の Lambda API をローカルで起動します。")
    parser.add_argument("--host", default="127.0.0.1", help="バインドするホスト（デフォルト: 127.0.0.1）")
    parser.add_argument("--port", type=int, default=8001, help="待受ポート（デフォルト: 8001）")
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parents[3]
    ApiHandler.lambda_handler = load_lambda_handler(repo_root)

    server = ThreadingHTTPServer((args.host, args.port), ApiHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
