import { Moon, Sun } from 'lucide-react';
import { useTheme } from './../components/ThemeContext.tsx';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all active:scale-95 bg-white/10 mt-6 hover:bg-white/20 text-white backdrop-blur-md border border-white/10"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" /> // Show Moon if currently Light
      ) : (
        <Sun className="w-5 h-5" />  // Show Sun if currently Dark
      )}
    </button>
  );
}