import { createClient } from './supabase';

export type ReportStatus = 'in_progress' | 'resolved';

export type Report = {
  id: string;
  reason: string;
  details: string;
  proof_url: string | null;
  status: ReportStatus;
  reported_user_id: string | null;
  created_at: string;
};

/** Fetch reports submitted by the current user. */
export async function fetchMyReports(reporterId: string | null): Promise<Report[]> {
  if (!reporterId) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reports')
      .select('id, reason, details, proof_url, status, reported_user_id, created_at')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      proof_url: r.proof_url ?? null,
      status: r.status as ReportStatus,
      reported_user_id: r.reported_user_id ?? null,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

export type CreateReportInput = {
  reporter_id: string;
  reported_user_id?: string | null;
  reason: string;
  details: string;
  proof_url?: string | null;
};

/** Create a new report. Returns report id or error message. */
export async function createReport(input: CreateReportInput): Promise<{ id: string } | { error: string }> {
  const { reporter_id, reported_user_id, reason, details, proof_url } = input;
  if (!reporter_id || !reason?.trim() || !details?.trim()) {
    return { error: 'Reason and details are required' };
  }
  if (details.trim().length < 20) {
    return { error: 'Details must be at least 20 characters' };
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id,
        reported_user_id: reported_user_id || null,
        reason: reason.trim(),
        details: details.trim(),
        proof_url: proof_url?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return { error: error.message };
    if (!data?.id) return { error: 'Failed to create report' };
    return { id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create report' };
  }
}
