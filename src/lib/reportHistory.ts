'use client';

import { createClient } from './supabase/client';

export type ReportHistoryAction =
  | 'created'
  | 'viewed'
  | 'updated'
  | 'resolved'
  | 'deleted'
  | 'status_changed';

export interface ReportHistory {
  id?: string;
  report_id: string;
  user_id: string;
  action: ReportHistoryAction;
  details: string;
  created_at?: string;
}

export async function logReportHistory(
  reportId: string,
  action: ReportHistoryAction,
  details: string,
  userId?: string
) {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      console.warn('Report history: no user_id available');
      return;
    }

    const { error } = await supabase.from('report_history').insert({
      report_id: reportId,
      user_id: targetUserId,
      action,
      details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log report history:', error);
    }
  } catch (err) {
    console.error('Error logging report history:', err);
  }
}

export const reportHistoryLabels: Record<ReportHistoryAction, string> = {
  created: 'Dibuat',
  viewed: 'Dilihat',
  updated: 'Diperbarui',
  resolved: 'Diselesaikan',
  deleted: 'Dihapus',
  status_changed: 'Status Diubah',
};

export const reportHistoryColors: Record<ReportHistoryAction, string> = {
  created: 'bg-green-100 text-green-800',
  viewed: 'bg-blue-100 text-blue-800',
  updated: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  deleted: 'bg-red-100 text-red-800',
  status_changed: 'bg-purple-100 text-purple-800',
};