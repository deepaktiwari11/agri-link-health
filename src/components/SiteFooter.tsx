import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">KrishiSetu</p>
        <p className="mt-1 max-w-xl">{t("footer.tagline")}</p>
        <p className="mt-4 text-xs">
          © {new Date().getFullYear()} KrishiSetu. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
