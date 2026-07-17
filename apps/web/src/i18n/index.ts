import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import ru from "@/i18n/locales/ru.json";
import uz from "@/i18n/locales/uz.json";

export const LANGUAGES = [
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Русский" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    fallbackLng: "uz",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false }, // React o'zi XSS'dan himoya qiladi
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "chdpu-lang",
    },
  });

// <html lang=".."> va sana formatlash tili doim joriy tilga mos tursin
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

/** toLocaleDateString uchun joriy til lokali. */
export function dateLocale(): string {
  return i18n.language === "ru" ? "ru-RU" : "uz-UZ";
}

export default i18n;
