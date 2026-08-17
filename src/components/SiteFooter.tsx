export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">KrishiSetu</p>
        <p className="mt-1 max-w-xl">
          A direct bridge between farmers and merchants — farmers set their own prices, merchants buy
          straight from the field, and every plant gets an AI health check.
        </p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} KrishiSetu. Built for growers.</p>
      </div>
    </footer>
  );
}
