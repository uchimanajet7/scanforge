/**
 * ZXing アダプタ内部状態。
 */

let isLibraryLoaded = false;
let codeReader = null;
let isScanning = false;
let currentDecodeControl = null;

export function getIsLibraryLoaded() {
  return isLibraryLoaded;
}

export function setIsLibraryLoaded(value) {
  isLibraryLoaded = !!value;
}

export function getCodeReader() {
  return codeReader;
}

export function setCodeReader(reader) {
  codeReader = reader;
}

export function clearCodeReader() {
  codeReader = null;
}

export function getIsScanning() {
  return isScanning;
}

export function setIsScanning(value) {
  isScanning = !!value;
}

export function getCurrentDecodeControl() {
  return currentDecodeControl;
}

export function setCurrentDecodeControl(control) {
  currentDecodeControl = control;
}

export function clearDecodeControl() {
  currentDecodeControl = null;
}
