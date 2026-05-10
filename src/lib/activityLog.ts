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

  const userIdToUse = userId;
  if (!userIdToUse) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
  }

  const userIdFinal = userIdToUse || (await supabase.auth.getUser()).data.user?.id;
  if (!userIdFinal) return;

  await supabase.from('activity_logs').insert({
    user_id: userIdFinal,
    action,
    details: description,
  });
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