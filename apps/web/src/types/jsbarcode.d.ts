declare module 'jsbarcode' {
  const JsBarcode: (
    element: HTMLElement | SVGSVGElement | HTMLCanvasElement | HTMLImageElement,
    data: string,
    options?: Record<string, unknown>,
  ) => void;
  export default JsBarcode;
}
