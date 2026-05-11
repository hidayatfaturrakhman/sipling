'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const type = searchParams.get('type');

      if (!token || !email) {
        setStatus('error');
        setMessage('Link verifikasi tidak valid atau sudah kadaluarsa.');
        return;
      }

      const supabase = createClient();

      const { error } = await supabase.auth.verifyOtp({
        type: (type as 'signup') || 'email',
        email,
        token,
      });

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Verifikasi gagal. Silakan coba lagi.');
      } else {
        setStatus('success');
        setMessage('Email berhasil diverifikasi! Anda akan diarahkan ke halaman login.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Memverifikasi...</h2>
            <p className="text-gray-500">Mohon tunggu sebentar</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="bg-green-100 rounded-full p-4 mb-4 inline-flex">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Berhasil!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Mengarahkan ke login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="bg-red-100 rounded-full p-4 mb-4 inline-flex">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Gagal</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <a href="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
              Kembali ke Register
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Memuat...</h2>
        <p className="text-gray-500">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmContent />
    </Suspense>
  );
}
