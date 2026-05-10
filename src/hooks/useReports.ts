'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Report {
  id: string;
  category: string;
  description: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  resolution_photo_url?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface UseReportsOptions {
  userId?: string;
  filterStatus?: string;
  filterCategory?: string;
  limit?: number;
  includeProfile?: boolean;
}

interface UseReportsReturn {
  reports: Report[];
  loading: boolean;
  error: string | null;
  stats: { total: number; pending: number; resolved: number };
  refresh: () => Promise<void>;
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const { userId, filterStatus = 'all', filterCategory = 'all', limit, includeProfile = false } = options;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });

  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build main query
      let query = supabase
        .from('reports')
        .select(includeProfile ? '*' : '*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Fetch stats in parallel if userId provided
      let statsData = { total: 0, pending: 0, resolved: 0 };
      if (userId) {
        const [totalRes, pendingRes, resolvedRes] = await Promise.all([
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending').is('deleted_at', null),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'resolved').is('deleted_at', null)
        ]);
        statsData = {
          total: totalRes.count || 0,
          pending: pendingRes.count || 0,
          resolved: resolvedRes.count || 0
        };
      }

      setReports((reportsData as Report[]) || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, filterStatus, filterCategory, limit, includeProfile]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, stats, refresh: fetchReports };
}