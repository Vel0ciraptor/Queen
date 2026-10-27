import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'expanded';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'expanded') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
          isDark
            ? 'bg-[#251522] border-[#482038] text-[#FFE9F2] hover:bg-[#321B2E] hover:border-[#FF3D8F]/40'
            : 'bg-white border-[#FFB8D5] text-[#3D0022] hover:bg-[#FFF5FA] hover:border-[#FF3D8F]'
        } shadow-sm group ${className}`}
        aria-label="Cambiar tema de color"
      >
        <span className="flex items-center gap-2.5">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-12 ${
              isDark
                ? 'bg-[#F4C95D]/15 text-[#F4C95D]'
                : 'bg-[#FF3D8F]/15 text-[#FF3D8F]'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </span>
          <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </span>
        <span
          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
            isDark
              ? 'bg-[#F4C95D]/20 text-[#F4C95D]'
              : 'bg-[#FF3D8F]/15 text-[#B3003D]'
          }`}
        >
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 border flex items-center justify-center ${
        isDark
          ? 'bg-[#251522] border-[#482038] text-[#F4C95D] hover:bg-[#321B2E] hover:border-[#F4C95D]/50 hover:shadow-[0_0_15px_rgba(244,201,93,0.25)]'
          : 'bg-white border-[#FFB8D5] text-[#FF3D8F] hover:bg-[#FFF5FA] hover:border-[#FF3D8F] hover:shadow-[0_0_15px_rgba(255,61,143,0.2)]'
      } shadow-sm ${className}`}
      title={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-label="Cambiar tema"
    >
      <span className="transition-transform duration-300 hover:scale-110">
        {isDark ? <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
      </span>
    </button>
  );
};
