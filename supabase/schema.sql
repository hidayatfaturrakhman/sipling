-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  nik TEXT,
  phone TEXT,
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'warga')) DEFAULT 'warga',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category TEXT,
  description TEXT,
  photo_url TEXT,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  address TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending',
  resolution_photo_url TEXT,
  resolved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report History table
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'viewed', 'updated', 'resolved', 'deleted', 'status_changed')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  institution_name TEXT DEFAULT 'SIPLING',
  institution_logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (id, institution_name, description) VALUES ('default', 'SIPLING', 'Sistem Pelaporan Warga')
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Reports policies
CREATE POLICY "Anyone can view all reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Warga can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any reports" ON reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete reports" ON reports FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Activity logs policies
CREATE POLICY "Admins can view all logs" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Report History policies
CREATE POLICY "Anyone can view report history" ON report_history FOR SELECT USING (true);
CREATE POLICY "Users can create report history" ON report_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update report history" ON report_history FOR UPDATE USING (auth.uid() = user_id);

-- App Settings policies
CREATE POLICY "Anyone can view app settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update app settings" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
  ('jalan_rusak', 'Jalan Rusak', '🛣️'),
  ('sampah', 'Sampah', '🗑️'),
  ('jalan_berlubang', 'Jalan Berlubang', '🕳️'),
  ('lainnya', 'Lainnya', '📌')
ON CONFLICT (name) DO NOTHING;

-- Trigger to auto-create profile on signup with extended fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, nik, phone, address, latitude, longitude)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'warga'),
    NEW.raw_user_meta_data->>'nik',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    (NEW.raw_user_meta_data->>'latitude')::float,
    (NEW.raw_user_meta_data->>'longitude')::float
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to log login activity
CREATE OR REPLACE FUNCTION public.handle_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = NEW.id;

  INSERT INTO public.activity_logs (user_id, action, details)
  VALUES (NEW.id, 'login', 'User logged in');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public access to report photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos');
CREATE POLICY "Authenticated users can upload report photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own report photos" ON storage.objects FOR DELETE USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);