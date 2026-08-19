import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { IndianRupee, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CROP_CATALOG, UNITS } from "@/lib/crop-catalog";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Listings & Purchase Requests" },
      {
        name: "description",
        content:
          "Farmers manage crop listings and their fixed prices; merchants track the purchase requests they sent.",
      },
      { property: "og:title", content: "My Dashboard — KrishiSetu" },
      { property: "og:description", content: "Manage your crop listings and purchase requests." },
    ],
  }),
  component: DashboardPage,
});

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  description: string | null;
  location: string | null;
  is_available: boolean;
}

interface InquiryRow {
  id: string;
  product_id: string;
  merchant_id: string;
  farmer_id: string;
  quantity: number;
  offered_price: number | null;
  message: string | null;
  contact_phone: string | null;
  status: string;
  created_at: string;
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter the crop name").max(80),
  category: z.string().trim().min(2).max(30),
  price: z.coerce.number().min(0.01, "Set your price").max(10_000_000),
  unit: z.string().trim().min(1).max(20),
  quantity: z.coerce.number().min(0).max(10_000_000),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
});

const OTHER = "__other__";

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryValue, setCategoryValue] = useState(CROP_CATALOG[0]!.value);
  const [search, setSearch] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [customCrop, setCustomCrop] = useState("");
  const [unit, setUnit] = useState(CROP_CATALOG[0]!.defaultUnit);
  const [price, setPrice] = useState("");
  const [priceEdit, setPriceEdit] = useState<{ id: string; name: string; price: string } | null>(null);

  const activeCategory = CROP_CATALOG.find((c) => c.value === categoryValue) ?? CROP_CATALOG[0]!;
  const cropOptions = activeCategory.items.filter((i) =>
    i.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const cropName = selectedCrop === OTHER ? customCrop : selectedCrop;

  const pickCategory = (value: string) => {
    const cat = CROP_CATALOG.find((c) => c.value === value);
    setCategoryValue(value);
    setSearch("");
    setSelectedCrop("");
    setCustomCrop("");
    if (cat) setUnit(cat.defaultUnit);
  };

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const productsQuery = useQuery({
    queryKey: ["my-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("farmer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const inquiriesQuery = useQuery({
    queryKey: ["my-inquiries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InquiryRow[];
    },
  });

  const namesQuery = useQuery({
    queryKey: ["dashboard-lookup", user?.id, inquiriesQuery.data?.length],
    enabled: !!inquiriesQuery.data?.length,
    queryFn: async () => {
      const rows = inquiriesQuery.data ?? [];
      const ids = Array.from(new Set(rows.flatMap((r) => [r.merchant_id, r.farmer_id])));
      const productIds = Array.from(new Set(rows.map((r) => r.product_id)));
      const [{ data: people }, { data: prods }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase.from("products").select("id, name, unit").in("id", productIds),
      ]);
      return {
        people: Object.fromEntries(
          (people ?? []).map((p) => [p.id, p as { id: string; full_name: string; phone: string | null }]),
        ),
        products: Object.fromEntries(
          (prods ?? []).map((p) => [p.id, p as { id: string; name: string; unit: string }]),
        ),
      };
    },
  });

  const addProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = productSchema.safeParse({
      name: cropName,
      category: categoryValue,
      price,
      unit,
      quantity: fd.get("quantity"),
      location: fd.get("location") || undefined,
      description: fd.get("description") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      farmer_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      price: parsed.data.price,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      location: parsed.data.location ?? profile?.location ?? null,
      description: parsed.data.description ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Crop listed at your price");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["my-products"] });
  };

  const toggleAvailable = async (p: ProductRow) => {
    const { error } = await supabase
      .from("products")
      .update({ is_available: !p.is_available })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["my-products"] });
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing removed");
    void qc.invalidateQueries({ queryKey: ["my-products"] });
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Request ${status}`);
    void qc.invalidateQueries({ queryKey: ["my-inquiries"] });
  };

  if (loading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  const inquiries = inquiriesQuery.data ?? [];
  const received = inquiries.filter((i) => i.farmer_id === user.id);
  const sent = inquiries.filter((i) => i.merchant_id === user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hello{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {profile?.role ?? "member"} account
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> List a crop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>List your crop and fix the rate</DialogTitle>
            </DialogHeader>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <Label htmlFor="category">1. Product category</Label>
                <select
                  id="category"
                  value={categoryValue}
                  onChange={(e) => pickCategory(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CROP_CATALOG.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="crop">2. Select your product</Label>
                <Input
                  id="crop-search"
                  value={search}
                  placeholder={`Search in ${activeCategory.label.toLowerCase()}…`}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-1.5"
                />
                <select
                  id="crop"
                  size={6}
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background p-1 text-sm"
                >
                  {cropOptions.map((item) => (
                    <option key={item} value={item} className="rounded px-2 py-1">
                      {item}
                    </option>
                  ))}
                  <option value={OTHER}>Other (type my own)</option>
                </select>
                {selectedCrop === OTHER && (
                  <Input
                    value={customCrop}
                    maxLength={80}
                    placeholder="Enter your product name"
                    onChange={(e) => setCustomCrop(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price">3. Fix your price (₹ per unit)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <select
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {cropName && price && (
                <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  {cropName} — ₹{Number(price || 0).toLocaleString("en-IN")} / {unit}
                </p>
              )}
              <div>
                <Label htmlFor="quantity">Quantity available</Label>
                <Input id="quantity" name="quantity" type="number" step="0.1" min="0" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="location">Village / Market</Label>
                <Input
                  id="location"
                  name="location"
                  maxLength={120}
                  defaultValue={profile?.location ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} maxLength={600} className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Publishing…" : "Publish listing"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="listings" className="mt-8">
        <TabsList>
          <TabsTrigger value="listings">My listings ({productsQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="received">Requests received ({received.length})</TabsTrigger>
          <TabsTrigger value="sent">Requests sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          {productsQuery.data?.length === 0 && (
            <div className="card-surface p-10 text-center text-sm text-muted-foreground">
              You haven't listed any crop yet. Use “List a crop” to set your own rate.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(productsQuery.data ?? []).map((p) => (
              <div key={p.id} className="card-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant={p.is_available ? "default" : "secondary"}>
                    {p.is_available ? "Live" : "Paused"}
                  </Badge>
                </div>
                <p className="mt-2 flex items-baseline text-xl font-bold text-primary">
                  <IndianRupee className="size-4" />
                  {Number(p.price).toLocaleString("en-IN")}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ {p.unit}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {Number(p.quantity).toLocaleString("en-IN")} {p.unit} in stock
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAvailable(p)}>
                    {p.is_available ? "Pause" : "Resume"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeProduct(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="received" className="mt-6 space-y-4">
          {received.length === 0 && (
            <div className="card-surface p-10 text-center text-sm text-muted-foreground">
              No merchant has contacted you yet.
            </div>
          )}
          {received.map((i) => (
            <div key={i.id} className="card-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {namesQuery.data?.products?.[i.product_id]?.name ?? "Crop"} ·{" "}
                  {Number(i.quantity).toLocaleString("en-IN")}{" "}
                  {namesQuery.data?.products?.[i.product_id]?.unit ?? ""}
                </h3>
                <Badge variant="secondary" className="capitalize">
                  {i.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                From {namesQuery.data?.people?.[i.merchant_id]?.full_name ?? "Merchant"} · offered ₹
                {Number(i.offered_price ?? 0).toLocaleString("en-IN")} · phone {i.contact_phone ?? "—"}
              </p>
              {i.message && <p className="mt-2 text-sm">{i.message}</p>}
              {i.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setStatus(i.id, "accepted")}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "declined")}>
                    Decline
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sent" className="mt-6 space-y-4">
          {sent.length === 0 && (
            <div className="card-surface p-10 text-center text-sm text-muted-foreground">
              You haven't contacted any farmer yet.{" "}
              <Link to="/market" className="text-primary underline">
                Browse the marketplace
              </Link>
              .
            </div>
          )}
          {sent.map((i) => (
            <div key={i.id} className="card-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {namesQuery.data?.products?.[i.product_id]?.name ?? "Crop"} ·{" "}
                  {Number(i.quantity).toLocaleString("en-IN")}{" "}
                  {namesQuery.data?.products?.[i.product_id]?.unit ?? ""}
                </h3>
                <Badge variant="secondary" className="capitalize">
                  {i.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                To {namesQuery.data?.people?.[i.farmer_id]?.full_name ?? "Farmer"}
                {i.status === "accepted" && namesQuery.data?.people?.[i.farmer_id]?.phone
                  ? ` · call ${namesQuery.data.people[i.farmer_id]?.phone}`
                  : ""}
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
