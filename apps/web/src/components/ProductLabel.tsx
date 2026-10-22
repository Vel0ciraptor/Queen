import React from 'react';
import { BarcodeSvg } from './BarcodeSvg';
import { MediaType } from '../store/labelPrefsStore';
import { currency } from '../lib/format';

export interface LabelData {
  sku: string;
  name: string;
  salePrice: string | number;
}

interface ProductLabelProps {
  data: LabelData;
  mediaType: MediaType;
  widthMm: number;
  heightMm: number;
  /** true cuando se renderiza dentro del área de impresión (estilos mm reales) */
  forPrint?: boolean;
}

// Diferencia de medio: linerless se pega directo (márgenes mínimos, medida
// exacta); el rollo continuo deja holgura vertical para cortar a mano.
const paddingFor = (mediaType: MediaType): string =>
  mediaType === 'linerless' ? '1mm' : '2.5mm';

export const ProductLabel: React.FC<ProductLabelProps> = ({
  data,
  mediaType,
  widthMm,
  heightMm,
  forPrint = false,
}) => {
  const padding = paddingFor(mediaType);

  return (
    <div
      className="product-label"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding,
        ...(forPrint ? { border: 'none', borderRadius: 0 } : null),
      }}
    >
      <div className="pl-name">{data.name}</div>
      <div className="pl-price">{currency(data.salePrice)}</div>
      <BarcodeSvg value={data.sku} className="pl-barcode" />
      <div className="pl-sku">{data.sku}</div>
    </div>
  );
};
