import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme"; // index.html ham shu kalitni o'qiydi (flash oldini olish)
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches
    ? "dark"
    : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function applyToDocument(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

type ThemeState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const initialTheme = readStoredTheme();

/**
 * Mavzu — bitta umumiy holat. Sahifada bir nechta ThemeToggle (desktop + mobil) va
 * Toaster bo'lsa ham hammasi bir xil qiymatni ko'radi va sinxron yangilanadi.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: resolve(initialTheme),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* xususiy rejim — faqat joriy sessiyada ishlaydi */
    }
    const resolvedTheme = resolve(theme);
    applyToDocument(resolvedTheme);
    set({ theme, resolvedTheme });
  },
}));

if (typeof window !== "undefined") {
  applyToDocument(useThemeStore.getState().resolvedTheme);

  // OS mavzusi o'zgarsa — faqat "system" rejimida kuzatamiz (bitta global tinglovchi)
  window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (useThemeStore.getState().theme !== "system") return;
    const resolvedTheme = systemTheme();
    applyToDocument(resolvedTheme);
    useThemeStore.setState({ resolvedTheme });
  });

  // Boshqa tabda o'zgartirilsa — shu tab ham moslashadi
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const theme = isTheme(e.newValue) ? e.newValue : "system";
    const resolvedTheme = resolve(theme);
    applyToDocument(resolvedTheme);
    useThemeStore.setState({ theme, resolvedTheme });
  });
}
