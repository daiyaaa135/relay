'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchMyReports, type Report } from '@/lib/reports';
import { PageHeader } from '@/app/components/PageHeader';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function RecentReportsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const list = await fetchMyReports(user.id);
      if (!cancelled) setReports(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader className="bg-transparent border-b-0">
        <h1 className="text-2xl font-serif text-relay-text dark:text-relay-text-dark tracking-tighter">Recent Reports</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-10 pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-relay-bg dark:bg-relay-bg-dark flex items-center justify-center border border-relay-border dark:border-relay-border-dark mb-6">
              <span className="material-symbols-outlined text-relay-muted !text-4xl">history</span>
            </div>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light font-light max-w-[260px] leading-relaxed ">
              You haven&apos;t submitted any reports yet. Reports are reviewed by our support team within 24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
                    {report.reason}
                  </p>
                  <span
                    className="shrink-0 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark border border-relay-border dark:border-relay-border-dark"
                  >
                    {report.status === 'resolved' ? 'Resolved' : 'In progress'}
                  </span>
                </div>
                <p className="text-xs text-relay-muted dark:text-relay-muted-light line-clamp-2 mb-2">
                  {report.details}
                </p>
                <p className="text-[10px] text-relay-muted tracking-widest">
                  {formatDate(report.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
