import JsBarcode from 'jsbarcode';
import { MediaType } from '../store/labelPrefsStore';
import { LabelData } from '../components/ProductLabel';

const PRINT_ROOT_ID = 'qs-print-root';

// Genera el SVG del código de barras como string para embeberlo en el HTML
// de impresión (no podemos usar el componente React aquí).
const barcodeSvgString = (sku: string): string => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, sku, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 13,
      height: 55,
      width: 2,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return `<span style="font-family:monospace;font-size:12px">${sku}</span>`;
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );

const labelBlockHtml = (data: LabelData, mediaType: MediaType, widthMm: number, heightMm: number): string => {
  const padding = mediaType === 'linerless' ? '1mm' : '2.5mm';
  const price = Number(data.salePrice).toFixed(2);
  return `
    <div class="qs-label" style="width:${widthMm}mm;height:${heightMm}mm;padding:${padding}">
      <div class="qs-label-name">${escapeHtml(data.name)}</div>
      <div class="qs-label-price">$${price}</div>
      <div class="qs-label-barcode">${barcodeSvgString(data.sku)}</div>
      <div class="qs-label-sku">${escapeHtml(data.sku)}</div>
    </div>`;
};

interface PrintLabelsOptions {
  items: LabelData[];
  mediaType: MediaType;
  widthMm: number;
  heightMm: number;
}

// Renderiza las etiquetas en un contenedor oculto de la propia página y abre
// el diálogo de impresión. Funciona en PC y en Android (donde window.open suele
// bloquearse); en el celular se elige la app mPrint → SPP-R310 por Bluetooth.
export const printLabels = ({ items, mediaType, widthMm, heightMm }: PrintLabelsOptions): void => {
  // Limpieza previa por si reintenta
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.body.classList.remove('qs-printing');

  const root = document.createElement('div');
  root.id = PRINT_ROOT_ID;
  root.innerHTML = items.map((d) => labelBlockHtml(d, mediaType, widthMm, heightMm)).join('');
  document.body.appendChild(root);
  document.body.classList.add('qs-printing');

  const cleanup = () => {
    document.body.classList.remove('qs-printing');
    root.remove();
  };

  // afterprint es el evento correcto; el timeout es respaldo en navegadores
  // que no lo disparan de forma confiable.
  const onAfterPrint = () => {
    window.removeEventListener('afterprint', onAfterPrint);
    cleanup();
  };
  window.addEventListener('afterprint', onAfterPrint);

  // Pequeña pausa para que el navegador pinte el contenedor antes de imprimir.
  setTimeout(() => {
    try {
      window.print();
    } finally {
      setTimeout(cleanup, 1000);
    }
  }, 50);
};
