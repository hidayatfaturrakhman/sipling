import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ReportResolvedPayload {
  email: string;
  fullName: string;
  categoryLabel: string;
  description: string;
  resolutionPhotoUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { email, fullName, categoryLabel, description, resolutionPhotoUrl }: ReportResolvedPayload = await req.json();

    if (!email || !categoryLabel) {
      return new Response(
        JSON.stringify({ error: "Email and categoryLabel are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.resend.com/emails/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIPLING <noreply@sipling.app>",
        to: email,
        subject: `SIPLING - Laporan ${categoryLabel} Sudah Diselesaikan`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">SIPLING</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Sistem Pelaporan Lingkungan</p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Halo, ${fullName || 'Warga'}!</h2>

                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                  Terima kasih telah melaporkan masalah <strong>${categoryLabel}</strong>. Kami很开心 dapat memberitahu bahwa laporan Anda telah <strong>diselesaikan</strong>.
                </p>

                ${description ? `
                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">Deskripsi Laporan:</p>
                  <p style="color: #1f2937; font-size: 14px; margin: 0;">${description}</p>
                </div>
                ` : ''}

                ${resolutionPhotoUrl ? `
                <div style="text-align: center; margin: 24px 0;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px 0;">Bukti Foto Perbaikan:</p>
                  <img src="${resolutionPhotoUrl}" alt="Bukti Perbaikan" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                </div>
                ` : ''}

                <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="color: #166534; font-size: 14px; margin: 0; text-align: center;">
                    ✓ Laporan Anda telah diselesaikan oleh tim kami
                  </p>
                </div>

                <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                  Jika ada pertanyaan atau laporan baru, silakan kunjungi aplikasi SIPLING kami.
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Email ini dikirim secara otomatis oleh sistem SIPLING.<br/>
                  Jangan membalas email ini.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
