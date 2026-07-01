-- Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Requests Table
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_category TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cod_available BOOLEAN DEFAULT false,
  delivery_available BOOLEAN DEFAULT false,
  distance_km DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(request_id, seller_id) -- Prevent duplicate bids
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Requests
CREATE POLICY "Anyone can view open requests" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Customers can insert their own requests" ON public.requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update their own requests" ON public.requests FOR UPDATE USING (auth.uid() = customer_id);

-- RLS Policies for Offers
CREATE POLICY "Anyone can view offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Sellers can insert their own offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own offers" ON public.offers FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own offers" ON public.offers FOR DELETE USING (auth.uid() = seller_id);

-- Create storage bucket for request images
-- This must be public so they can be viewed
INSERT INTO storage.buckets (id, name, public) VALUES ('request-images', 'request-images', true) ON CONFLICT DO NOTHING;

-- RLS for Storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'request-images');
CREATE POLICY "Authenticated users can upload objects" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'request-images' AND auth.role() = 'authenticated');
