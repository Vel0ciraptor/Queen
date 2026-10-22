import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSvgProps {
  value: string;
  className?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
}

// Renderiza un código de barras Code128 (valor = SKU) en un <svg>.
export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  className,
  height = 60,
  width = 2,
  fontSize = 14,
  displayValue = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      JsBarcode(svg, value, {
        format: 'CODE128',
        displayValue,
        fontSize,
        height,
        width,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // SKU con caracteres inválidos para Code128: dejamos el svg vacío
    }
  }, [value, height, width, fontSize, displayValue]);

  return <svg ref={svgRef} className={className} />;
};
