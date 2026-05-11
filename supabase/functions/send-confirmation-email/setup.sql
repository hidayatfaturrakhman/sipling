-- Custom email confirmation trigger function
-- Drop existing function if exists
CREATE OR REPLACE FUNCTION public.handle_new_user_email()
RETURNS TRIGGER AS $$
DECLARE
  confirm_url TEXT;
  response JSON;
BEGIN
  -- Generate confirmation URL
  confirm_url := (
    SELECT make_confirm_url(NEW.id, NEW.email)
  );

  -- Call Edge Function to send custom email
  -- Note: You need to deploy the Edge Function first via:
  -- supabase functions deploy send-confirmation-email

  -- Call the Edge Function using supabase-js fetch
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-confirmation-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'confirmUrl', confirm_url
    )
  ) INTO response;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Silent fail - don't break the signup process
  RAISE NOTICE 'Failed to send confirmation email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to generate confirmation URL
CREATE OR REPLACE FUNCTION make_confirm_url(user_id UUID, user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  settings_row RECORD;
  token TEXT;
  base_url TEXT;
BEGIN
  -- Get app settings
  SELECT * INTO settings_row FROM app_settings LIMIT 1;
  base_url := COALESCE(settings_row.institution_name, 'SIPLING');

  -- Generate confirmation token using Supabase auth
  -- This is a placeholder - actual implementation depends on your Supabase config
  RETURN 'https://your-app-url.com/auth/confirm?token=' || encode(user_id::text, 'hex') || '&email=' || encode(user_email::bytea, 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
