import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MediaType = 'continuous' | 'linerless';

interface LabelPrefs {
  mediaType: MediaType;
  labelWidthMm: number;
  labelHeightMm: number;
  setMediaType: (mediaType: MediaType) => void;
  setLabelWidthMm: (widthMm: number) => void;
  setLabelHeightMm: (heightMm: number) => void;
}

// Preferencias de etiqueta guardadas por dispositivo (cada caja puede tener
// su impresora / tipo de rollo). No se guardan en la base de datos global.
export const useLabelPrefs = create<LabelPrefs>()(
  persist(
    (set) => ({
      mediaType: 'continuous',
      labelWidthMm: 80,
      labelHeightMm: 50,
      setMediaType: (mediaType) => set({ mediaType }),
      setLabelWidthMm: (labelWidthMm) => set({ labelWidthMm }),
      setLabelHeightMm: (labelHeightMm) => set({ labelHeightMm }),
    }),
    { name: 'queen_label_prefs' },
  ),
);
