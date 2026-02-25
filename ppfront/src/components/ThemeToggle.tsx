import { useThemeContext } from "../context/ThemeContext";
import type { Theme } from "../hooks/useTheme";

const options: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();

  return (
    <div className="theme-toggle">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={theme === opt.value ? "active" : ""}
          onClick={() => setTheme(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
