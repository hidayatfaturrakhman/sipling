# Custom Email Confirmation - SIPLING

Edge Function ini mengirim email verifikasi dengan subject **"SIPLING - Verifikasi Email Anda"** menggunakan Resend API.

## Prerequisites

1. **Resend Account** - Daftar di [resend.com](https://resend.com)
2. **API Key** - Generate API key dari Resend dashboard
3. **Domain/Email** - Verifikasi domain di Resend (atau gunakan email testing)

## Setup

### 1. Deploy Edge Function ke Supabase

```bash
# Install Supabase CLI (manual download dari https://github.com/supabase/cli/releases)
# Atau gunakan cara lain sesuai sistem operasi Anda

# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_REF

# Set environment variable
supabase secrets set RESEND_API_KEY=re_YOUR_API_KEY

# Deploy function
supabase functions deploy send-confirmation-email
```

### 2. Setup Resend API Key di Supabase Dashboard (Alternative)

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Project Settings > Environment Variables
3. Tambahkan: `RESEND_API_KEY=re_YOUR_API_KEY`

### 3. Jalankan SQL Setup (Optional)

Jalankan `setup.sql` di Supabase SQL Editor jika ingin trigger otomatis saat signup.

## Testing

Test Edge Function secara manual:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-confirmation-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email": "test@example.com", "confirmUrl": "https://sipling.app/auth/confirm?token=xxx"}'
```

## Konfigurasi Email di Resend

1. Login ke [resend.com](https://resend.com)
2. Buat Domain atau gunakan testing email `@resend.dev`
3. Copy API Key ke Supabase secrets

## Troubleshooting

**Email tidak terkirim?**
- Cek logs: `supabase functions logs send-confirmation-email`
- Pastikan RESEND_API_KEY sudah diset dengan benar
- Cek folder spam email recipient
