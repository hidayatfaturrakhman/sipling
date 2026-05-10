'use client';

import { createClient } from './supabase/client';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'create_report'
  | 'update_report'
  | 'delete_report'
  | 'resolve_report'
  | 'create_category'
  | 'update_category'
  | 'delete_category'
  | 'create_user'
  | 'update_user'
  | 'delete_user';

export async function logActivity(
  action: ActivityAction,
  description: string,
  userId?: string
) {
  const supabase = createClient();

  try {
    // If userId is provided, use it directly
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      console.warn('Activity log: no user_id available');
      return;
    }

    console.log('Logging activity:', { userId, action, description });

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      details: description,
    });

    if (error) {
      console.error('Failed to log activity:', error);
    } else {
      console.log('Activity logged successfully');
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

export const activityLabels: Record<ActivityAction, string> = {
  login: 'Login',
  logout: 'Logout',
  register: 'Registrasi',
  create_report: 'Buat Laporan',
  update_report: 'Update Laporan',
  delete_report: 'Hapus Laporan',
  resolve_report: 'Selesaikan Laporan',
  create_category: 'Buat Kategori',
  update_category: 'Update Kategori',
  delete_category: 'Hapus Kategori',
  create_user: 'Buat User',
  update_user: 'Update User',
  delete_user: 'Hapus User',
};