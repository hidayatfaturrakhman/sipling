'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  nik?: string;
  phone?: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    nik: '',
    address: '',
    phone: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressFromGps, setAddressFromGps] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.display_name) {
            setAddressFromGps(data.display_name);
          }
        })
        .catch(console.error);
    }
  }, [location]);

  const validation = useMemo((): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Format email tidak valid';
      }
    }

    // Password validation
    if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = 'Password minimal 8 karakter';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Password harus mengandung huruf besar';
      } else if (!/[a-z]/.test(formData.password)) {
        errors.password = 'Password harus mengandung huruf kecil';
      } else if (!/[0-9]/.test(formData.password)) {
        errors.password = 'Password harus mengandung angka';
      }
    }

    // Confirm password
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Password tidak cocok';
    }

    // Full name validation
    if (formData.fullName) {
      if (formData.fullName.trim().length < 2) {
        errors.fullName = 'Nama lengkap minimal 2 karakter';
      } else if (!/^[a-zA-Z\s']+$/.test(formData.fullName)) {
        errors.fullName = 'Nama hanya boleh huruf dan spasi';
      }
    }

    // NIK validation - must be 16 digits
    if (formData.nik) {
      if (!/^\d+$/.test(formData.nik)) {
        errors.nik = 'NIK harus berupa angka';
      } else if (formData.nik.length !== 16) {
        errors.nik = 'NIK harus 16 digit';
      }
    }

    // Phone validation - Indonesian format
    if (formData.phone) {
      const phoneClean = formData.phone.replace(/[\s-]/g, '');
      const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
      if (!phoneRegex.test(phoneClean)) {
        errors.phone = 'Format no. HP tidak valid (contoh: 0812xxxx atau +62812xxxx)';
      }
    }

    return errors;
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Format phone number
    if (name === 'phone') {
      const cleaned = value.replace(/[^\d]/g, '');
      setFormData({ ...formData, [name]: cleaned });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      fullName: true,
      nik: true,
      phone: true,
    });

    // Check validation
    if (Object.keys(validation).length > 0) {
      setError('Mohon periksa kembali data yang diisi');
      return;
    }

    // Validate required fields
    if (!formData.email || !formData.password || !formData.fullName || !formData.nik || !formData.phone) {
      setError('Semua field wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'warga',
            nik: formData.nik,
            phone: formData.phone,
            address: formData.address || addressFromGps,
            latitude: location?.lat || null,
            longitude: location?.lng || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  const isFieldError = (field: keyof ValidationErrors) => touched[field] && validation[field];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="bg-green-100 rounded-full p-4 mb-4 inline-flex">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-gray-600 mb-2">Silakan verifikasi email Anda terlebih dahulu.</p>
          <p className="text-sm text-gray-500 mb-4">Kami telah mengirim link verifikasi ke email Anda.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Daftar Warga</h1>
            <p className="text-gray-500 mt-1">Sistem Pelaporan Warga</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Akun</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      isFieldError('email') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {isFieldError('email') && (
                    <p className="text-xs text-red-500 mt-1">{validation.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                    <span className="text-xs text-gray-500 font-normal ml-1">(8+ karakter, huruf besar, kecil, angka)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        isFieldError('password') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {isFieldError('password') && (
                    <p className="text-xs text-red-500 mt-1">{validation.password}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        isFieldError('confirmPassword') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {isFieldError('confirmPassword') && (
                    <p className="text-xs text-red-500 mt-1">{validation.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Info Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Data Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      isFieldError('fullName') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {isFieldError('fullName') && (
                    <p className="text-xs text-red-500 mt-1">{validation.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIK *
                    <span className="text-xs text-gray-500 font-normal ml-1">(16 digit)</span>
                  </label>
                  <input
                    type="text"
                    name="nik"
                    value={formData.nik}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={16}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      isFieldError('nik') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {isFieldError('nik') && (
                    <p className="text-xs text-red-500 mt-1">{validation.nik}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formData.nik.length}/16 digit</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. HP *
                    <span className="text-xs text-gray-500 font-normal ml-1">(08xxxxxxxxx)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={14}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      isFieldError('phone') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0812xxxxx"
                    required
                  />
                  {isFieldError('phone') && (
                    <p className="text-xs text-red-500 mt-1">{validation.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Alamat</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat {locationLoading ? '(Mendeteksi lokasi...)' : '(Opsional)'}
                  </label>
                  {location && (
                    <div className="mb-2 text-xs text-gray-500 flex items-center gap-1">
                      <span>📍</span>
                      <span>GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                    </div>
                  )}
                  <textarea
                    name="address"
                    value={formData.address || addressFromGps}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={location ? 'Atau masukkan alamat manual...' : 'Aktifkan GPS untuk auto-detect'}
                  />
                  {addressFromGps && !formData.address && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Terisi otomatis dari GPS
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Link
                href="/login"
                className="flex-1 text-center py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={loading || locationLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Mendaftarkan...' : 'Daftar'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}