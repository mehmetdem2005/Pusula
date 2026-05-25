-- Pusula — Kayıtta kullanıcı adı (handle)
-- handle_new_user trigger'ı, kayıt metadata'sındaki handle'ı public.users.handle'a yazar.
-- Çakışırsa son ek ekleyerek benzersiz yapar → kayıt asla bu yüzden başarısız olmaz.
-- Run with: supabase migration up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  want text;
  final_handle text;
  n int := 0;
BEGIN
  want := lower(nullif(trim(NEW.raw_user_meta_data->>'handle'), ''));
  IF want IS NOT NULL AND want ~ '^[a-z0-9_]{3,30}$' THEN
    final_handle := want;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE handle = final_handle) LOOP
      n := n + 1;
      final_handle := left(want, 25) || '_' || to_char(n, 'FM0000');
    END LOOP;
  ELSE
    final_handle := NULL;
  END IF;

  INSERT INTO public.users (id, email, phone, display_name, role, handle)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'individual'),
    final_handle
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
