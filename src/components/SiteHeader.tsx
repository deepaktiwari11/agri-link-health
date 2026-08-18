import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ChatAssistant } from "@/components/ChatAssistant";

const links = [
  { to: "/", label: "Home" },
  { to: "/market", label: "Marketplace" },
  { to: "/scan", label: "Leaf Scan" },
  { to: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-hero-gradient text-primary-foreground">
            <Leaf className="size-5" />
          </span>
          <span className="text-lg">KrishiSetu</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium text-primary bg-secondary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ChatAssistant />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || user.email} · {profile?.role ?? "…"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              Sign in
            </Button>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)}>
          <Menu className="size-5" />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  void navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/auth" });
                }}
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
