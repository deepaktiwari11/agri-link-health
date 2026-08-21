import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee, Leaf, ScanLine, ShieldCheck, Sprout, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import heroImage from "@/assets/hero-farm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KrishiSetu — Farmers Set the Price, Merchants Buy Direct" },
      {
        name: "description",
        content:
          "List your crops at your own rate, let merchants contact you directly, and scan any leaf to detect disease plus the fertilizer and vitamins your plant needs.",
      },
      { property: "og:title", content: "KrishiSetu — Farmers Set the Price, Merchants Buy Direct" },
      {
        property: "og:description",
        content:
          "A direct farmer-to-merchant marketplace with an AI plant leaf disease and nutrition scanner.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  { icon: Sprout, title: "home.step1.title", text: "home.step1.text" },
  { icon: Store, title: "home.step2.title", text: "home.step2.text" },
  { icon: ShieldCheck, title: "home.step3.title", text: "home.step3.text" },
];

function Home() {
  const { t } = useI18n();

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Farmer holding a basket of freshly harvested vegetables in a green field"
          width={1600}
          height={1000}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-gradient opacity-85" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-primary-foreground md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Leaf className="size-3.5" /> {t("home.badge")}
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {t("home.title")}
          </h1>
          <p className="mt-5 max-w-xl text-base opacity-90 md:text-lg">{t("home.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/market">{t("home.cta.market")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-background/15"
            >
              <Link to="/scan">{t("home.cta.scan")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("home.how")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="card-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{t(s.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(s.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-soft-gradient">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              <ScanLine className="size-3.5" /> {t("home.ai.badge")}
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              {t("home.ai.title")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("home.ai.text")}</p>
            <Button asChild className="mt-6">
              <Link to="/scan">{t("home.ai.cta")}</Link>
            </Button>
          </div>
          <div className="card-surface p-6">
            <ul className="space-y-4 text-sm">
              {["home.ai.p1", "home.ai.p2", "home.ai.p3", "home.ai.p4", "home.ai.p5"].map((k) => (
                <li key={k} className="flex gap-3">
                  <Leaf className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card-surface flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <IndianRupee className="size-5 text-primary" /> {t("home.final.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.final.text")}</p>
          </div>
          <Button asChild size="lg">
            <Link to="/auth">{t("home.final.cta")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
