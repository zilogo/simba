import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

// Get saved language from localStorage or default to browser language
const getSavedLanguage = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("language");
    if (saved && (saved === "en" || saved === "zh")) {
      return saved;
    }
    // Detect browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) {
      return "zh";
    }
  }
  return "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Save language preference when changed
i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("language", lng);
  }
});

export default i18n;
