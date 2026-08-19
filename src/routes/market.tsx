import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { IndianRupee, MapPin, Package, Phone, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Crop Marketplace — Buy Direct From Farmers" },
      {
        name: "description",
        content:
          "Browse fresh crops listed by farmers at their own fixed rates and contact the farmer directly to buy.",
      },
      { property: "og:title", content: "Crop Marketplace — KrishiSetu" },
      {
        property: "og:description",
        content: "Fresh produce listed by farmers at their own price. Contact and buy direct.",
      },
    ],
  }),
  component: MarketPage,
});

interface ProductRow {
  id: string;
  farmer_id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  description: string | null;
  location: string | null;
  harvest_date: string | null;
  is_available: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
}

const inquirySchema = z.object({
  quantity: z.coerce.number().min(0.1, "Enter the quantity you want").max(1_000_000),
  offered_price: z.coerce.number().min(0).max(1_000_000).optional(),
  contact_phone: z.string().trim().min(6, "Add a phone number the farmer can call").max(20),
  message: z.string().trim().max(500).optional(),
});

const categories: { value: string; label: string }[] = [
  { value: "all", label: "All crops" },
  ...CROP_CATALOG.map((c) => ({ value: c.value, label: c.label })),
  { value: "other", label: "Other" },
];

const sortOptions = [
  { value: "recent", label: "Newest first" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
];

function MarketPage() {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState<ProductRow | null>(null);
  const [sending, setSending] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["market-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const farmerIds = useMemo(
    () => Array.from(new Set((productsQuery.data ?? []).map((p) => p.farmer_id))),
    [productsQuery.data],
  );

  const farmersQuery = useQuery({
    queryKey: ["market-farmers", farmerIds],
    enabled: farmerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, location")
        .in("id", farmerIds);
      if (error) throw error;
      const map: Record<string, ProfileRow> = {};
      for (const row of (data ?? []) as ProfileRow[]) map[row.id] = row;
      return map;
    },
  });

  const filtered = (productsQuery.data ?? []).filter((p) => {
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.location ?? "").toLowerCase().includes(term) ||
      (p.description ?? "").toLowerCase().includes(term);
    return matchesTerm && (category === "all" || p.category === category);
  });

  const submitInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!active || !user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = inquirySchema.safeParse({
      quantity: fd.get("quantity"),
      offered_price: fd.get("offered_price") || undefined,
      contact_phone: fd.get("contact_phone"),
      message: fd.get("message") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("inquiries").insert({
      product_id: active.id,
      merchant_id: user.id,
      farmer_id: active.farmer_id,
      quantity: parsed.data.quantity,
      offered_price: parsed.data.offered_price ?? active.price,
      contact_phone: parsed.data.contact_phone,
      message: parsed.data.message ?? null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request sent to the farmer");
    setActive(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Crop marketplace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every price here is fixed by the farmer who grew the crop. Contact them directly to buy.
      </p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search crop, village or district"
            className="pl-9"
            maxLength={80}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {productsQuery.isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading listings…</p>}

      {!productsQuery.isLoading && filtered.length === 0 && (
        <div className="card-surface mt-10 p-10 text-center">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No crops listed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Farmers can add their produce from the dashboard.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const farmer = farmersQuery.data?.[p.farmer_id];
          return (
            <article key={p.id} className="card-surface flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <Badge variant="secondary" className="capitalize">
                  {p.category}
                </Badge>
              </div>
              <p className="mt-2 flex items-baseline gap-1 text-2xl font-bold text-primary">
                <IndianRupee className="size-5" />
                {Number(p.price).toLocaleString("en-IN")}
                <span className="text-sm font-normal text-muted-foreground">/ {p.unit}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {Number(p.quantity).toLocaleString("en-IN")} {p.unit} available
              </p>
              {p.description && <p className="mt-3 line-clamp-3 text-sm">{p.description}</p>}
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <User className="size-3.5" /> {farmer?.full_name || "Farmer"}
                </p>
                {(p.location || farmer?.location) && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {p.location || farmer?.location}
                  </p>
                )}
                {farmer?.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {farmer.phone}
                  </p>
                )}
              </div>
              <Button className="mt-5 w-full" onClick={() => setActive(p)}>
                Contact farmer to buy
              </Button>
            </article>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy {active?.name}</DialogTitle>
            <DialogDescription>
              Farmer's fixed rate: ₹{active ? Number(active.price).toLocaleString("en-IN") : ""} per{" "}
              {active?.unit}. Send your request and the farmer will contact you.
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please sign in as a merchant to send a purchase request.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign in / Register</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submitInquiry} className="space-y-4">
              {profile?.role === "farmer" && (
                <p className="rounded-md bg-secondary p-3 text-xs text-secondary-foreground">
                  Your account is registered as a farmer — you can still send a request.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">Quantity ({active?.unit})</Label>
                  <Input id="quantity" name="quantity" type="number" step="0.1" min="0.1" required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="offered_price">Your offer / {active?.unit}</Label>
                  <Input
                    id="offered_price"
                    name="offered_price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={active?.price}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact_phone">Your phone number</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  required
                  maxLength={20}
                  defaultValue={profile?.phone ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea id="message" name="message" maxLength={500} rows={3} className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Sending…" : "Send purchase request"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
