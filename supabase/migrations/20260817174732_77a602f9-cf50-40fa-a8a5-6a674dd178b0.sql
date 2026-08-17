CREATE TYPE public.user_role AS ENUM ('farmer','merchant');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'farmer',
  phone TEXT,
  location TEXT,
  about TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  harvest_date DATE,
  description TEXT,
  image_url TEXT,
  location TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Farmers can insert own products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can update own products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = farmer_id);

CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  offered_price NUMERIC(12,2) CHECK (offered_price >= 0),
  message TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view inquiries" ON public.inquiries FOR SELECT TO authenticated USING (auth.uid() = merchant_id OR auth.uid() = farmer_id);
CREATE POLICY "Merchants can create inquiries" ON public.inquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);
CREATE POLICY "Participants can update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (auth.uid() = merchant_id OR auth.uid() = farmer_id) WITH CHECK (auth.uid() = merchant_id OR auth.uid() = farmer_id);

CREATE TABLE public.leaf_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_url TEXT,
  plant_name TEXT,
  disease TEXT,
  severity TEXT,
  confidence NUMERIC(5,2),
  summary TEXT,
  treatment TEXT,
  fertilizers TEXT,
  vitamins TEXT,
  prevention TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.leaf_scans TO authenticated;
GRANT ALL ON public.leaf_scans TO service_role;
ALTER TABLE public.leaf_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scans" ON public.leaf_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scans" ON public.leaf_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scans" ON public.leaf_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'farmer'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX products_farmer_idx ON public.products(farmer_id);
CREATE INDEX inquiries_farmer_idx ON public.inquiries(farmer_id);
CREATE INDEX inquiries_merchant_idx ON public.inquiries(merchant_id);