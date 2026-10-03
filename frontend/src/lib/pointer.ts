// True on devices with a real pointer that can hover (a mouse or trackpad), false on touch screens
export function finePointer(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
