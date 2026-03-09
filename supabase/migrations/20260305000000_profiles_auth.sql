-- Tabla de perfiles de usuario (enlazada con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver perfiles (necesario para chat futuro)
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Cada usuario solo puede editar su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: al crear un usuario en auth, se crea su perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NOTA: Después de crear los usuarios en Supabase Dashboard, ejecutar:
-- UPDATE profiles SET role = 'admin' WHERE email = 'AppyStudios@gmail.com';
