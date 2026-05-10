'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setUser(profile);
    };
    getUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const navItems = [
    { href: '/admin', icon: '🗺️', label: 'Peta Lokasi', active: isActive('/admin') },
    { href: '/admin/laporan', icon: '📋', label: 'Semua Laporan', active: isActive('/admin/laporan') },
    { href: '/admin/users', icon: '👥', label: 'Users', active: isActive('/admin/users') },
    { href: '/admin/kategori', icon: '🏷️', label: 'Kategori', active: isActive('/admin/kategori') },
    { href: '/admin/activity', icon: '📜', label: 'Log Aktivitas', active: isActive('/admin/activity') },
    { href: '/admin/export', icon: '📊', label: 'Export', active: isActive('/admin/export') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm lg:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            <span className="text-lg font-bold text-blue-600">SIPLING</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-white shadow-sm hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-blue-600">SIPLING</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.full_name || user.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 flex justify-between items-center border-b">
                <h2 className="font-semibold">Menu</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="p-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      item.active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white shadow-sm min-h-screen p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  item.active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-8">
          {children}
          <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
            Aplikasi SIPLING by Hidayat Faturrakhman
          </footer>
        </main>
      </div>
    </div>
  );
}