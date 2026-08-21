import { Languages } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";

const options: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "hi", label: "हिं" },
];

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5"
      role="group"
      aria-label={t("lang.label")}
    >
      <Languages className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLang(o.value)}
          aria-pressed={lang === o.value}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            lang === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
