'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FilePlus,
  History,
  LogOut,
  Menu,
  X,
  Bell,
  MenuSquare,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
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
      setUser(profile);
    };
    getUser();
  }, [router, supabase]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setNotifLoading(true);
      const { data } = await supabase
        .from('reports')
        .select('*, profiles(full_name)')
        .eq('user_id', user.id)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(5);
      setNotifications(data || []);
      setNotifLoading(false);
    };
    if (showNotifications && user) {
      fetchNotifications();
    }
  }, [showNotifications, user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', active: isActive('/dashboard') },
    { href: '/dashboard/buat-laporan', icon: FilePlus, label: 'Buat Laporan', active: isActive('/dashboard/buat-laporan') },
    { href: '/dashboard/riwayat', icon: History, label: 'Riwayat', active: isActive('/dashboard/riwayat') },
  ];

  const categoryLabels: Record<string, string> = {
    jalan_rusak: 'Jalan Rusak',
    sampah: 'Sampah',
    jalan_berlubang: 'Jalan Berlubang',
    lainnya: 'Lainnya',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm lg:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            <span className="text-lg font-bold text-blue-600">SIPLING</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-600 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="text-gray-600 dark:text-gray-300 p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications Dropdown - Mobile */}
        {showNotifications && (
          <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t z-50 max-h-64 overflow-y-auto">
            <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
              <span className="font-semibold">Notifikasi</span>
              <button onClick={() => setShowNotifications(false)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {notifLoading ? (
              <div className="p-4 text-center text-gray-500">Memuat...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Tidak ada notifikasi</div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href="/dashboard/riwayat"
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <p className="text-sm font-medium text-green-600">✓ Laporan Diselesaikan</p>
                  <p className="text-xs text-gray-500">{categoryLabels[notif.category] || notif.category}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
            <h1 className="text-xl font-bold text-blue-600">SIPLING</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-gray-600 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border z-50 overflow-hidden">
                  <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                    <span className="font-semibold">Notifikasi</span>
                    <button onClick={() => setShowNotifications(false)} className="p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {notifLoading ? (
                    <div className="p-4 text-center text-gray-500">Memuat...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Tidak ada notifikasi</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notif) => (
                        <Link
                          key={notif.id}
                          href="/dashboard/riwayat"
                          onClick={() => setShowNotifications(false)}
                          className="block p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                              <Bell className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-600">✓ Laporan Diselesaikan!</p>
                              <p className="text-xs text-gray-500">{categoryLabels[notif.category] || notif.category}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notif.resolved_at ? new Date(notif.resolved_at).toLocaleDateString('id-ID') : ''}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-gray-600 dark:text-gray-300">{user.full_name || user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-50" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
                  <h2 className="font-semibold">Menu</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      item.active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 shadow-sm min-h-screen p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <MenuSquare className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">Menu Utama</span>
          </div>
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  item.active ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-8">
          {children}
          <footer className="mt-8 pt-4 border-t dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
            Aplikasi SIPLING by Hidayat Faturrakhman
          </footer>
        </main>
      </div>
    </div>
  );
}
