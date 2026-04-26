import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "id";

const STORAGE_KEY = "oc_lang";

const dictionaries: Record<Lang, Record<string, string>> = {
  en: {
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.language.helper": "Pick the language for menus and prompts.",
    "settings.signout": "Sign out",
    "settings.theme": "Theme",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.loading": "Loading…",
    "common.empty": "Nothing here yet.",
    "nav.discover": "Discover",
    "nav.feed": "Feed",
    "nav.community": "Community",
    "nav.messages": "Messages",
    "nav.sessions": "Sessions",
    "nav.challenges": "Challenges",
    "nav.me": "Me",
    "studio.subscribers": "Subscribers",
    "studio.payouts": "Payouts",
    "studio.referrals": "Referrals",
    "studio.analytics": "Analytics",
  },
  id: {
    "settings.title": "Pengaturan",
    "settings.language": "Bahasa",
    "settings.language.helper": "Pilih bahasa untuk menu dan pesan.",
    "settings.signout": "Keluar",
    "settings.theme": "Tema",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.back": "Kembali",
    "common.loading": "Memuat…",
    "common.empty": "Belum ada apa-apa di sini.",
    "nav.discover": "Jelajah",
    "nav.feed": "Feed",
    "nav.community": "Komunitas",
    "nav.messages": "Pesan",
    "nav.sessions": "Sesi",
    "nav.challenges": "Tantangan",
    "nav.me": "Saya",
    "studio.subscribers": "Pelanggan",
    "studio.payouts": "Pencairan",
    "studio.referrals": "Referral",
    "studio.analytics": "Analitik",
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "id") return stored;
    const browser = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() : "";
    return browser?.startsWith("id") ? "id" : "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const t = useCallback(
    (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
