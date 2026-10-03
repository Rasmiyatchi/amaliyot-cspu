import { useThemeStore, type ResolvedTheme, type Theme } from "@/stores/theme";

/** Umumiy mavzu holati (stores/theme) — barcha komponentlar sinxron. */
export function useTheme(): {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return { theme, resolvedTheme, setTheme };
}
