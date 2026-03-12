'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { createReport } from '@/lib/reports';
import { blockUser } from '@/lib/blocks';
import { PageHeader } from '@/app/components/PageHeader';

function ReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportedUserId = searchParams.get('userId');
  const listingId = searchParams.get('listingId');
  const isItemFlow = !!listingId;

  const markListingReported = (id: string | null) => {
    if (!id) return;
    try {
      const key = 'relay_reported_listings';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (!parsed.includes(id)) {
        const next = [...parsed, id];
        window.localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // ignore storage errors
    }
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const reportReasons = [
    { id: 'harassment', label: 'Harassment or Hate Speech', icon: 'sentiment_very_dissatisfied' },
    { id: 'fraud', label: 'Fraud or Scam Attempt', icon: 'gpp_maybe' },
    { id: 'item', label: 'Misrepresented / Stolen Item', icon: 'inventory' },
    { id: 'behavior', label: 'Inappropriate Behavior', icon: 'person_off' },
    { id: 'no_show', label: 'No-shows and lateness', icon: 'schedule' },
    { id: 'other', label: 'Something Else', icon: 'help' }
  ];

  const handleBack = () => {
    if (isItemFlow) {
      // For item reports, always go back to the Report item grid.
      const base = `/report/item?listingId=${encodeURIComponent(listingId ?? '')}${
        reportedUserId ? `&userId=${encodeURIComponent(reportedUserId)}` : ''
      }`;
      router.push(base);
      return;
    }
    if (step === 2) {
      setStep(1);
    } else {
      router.push('/safety');
    }
  };

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  // If we arrive from the item-report grid with a pre-selected reason, jump directly to step 2.
  useEffect(() => {
    const preselected = searchParams.get('reason');
    if (preselected && step === 1 && !reason) {
      setReason(preselected);
      setStep(2);
    }
  }, [searchParams, step, reason]);

  useEffect(() => {
    const preselected = searchParams.get('reason');
    if (preselected && step === 1 && !reason) {
      setReason(preselected);
      setStep(2);
    }
  }, [searchParams, step, reason]);

  const handleSubmit = async () => {
    if (!userId || details.length < 20 || (!isItemFlow && !proofFile)) return;
    setSubmitting(true);
    setSubmitError(null);
    let proofUrl = '';
    try {
      const supabase = createClient();
      if (proofFile) {
        const ext = proofFile.name.split('.').pop() || 'jpg';
        const path = `report-proofs/${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('listing-images')
          .upload(path, proofFile, { contentType: proofFile.type || 'image/jpeg', upsert: false });
        if (uploadErr) {
          setSubmitError('Failed to upload proof. Please try again.');
          setSubmitting(false);
          return;
        }
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
        proofUrl = data.publicUrl;
      }
    } catch {
      setSubmitError('Failed to upload proof. Please try again.');
      setSubmitting(false);
      return;
    }
    const result = await createReport({
      reporter_id: userId,
      reported_user_id: reportedUserId || null,
      reason,
      details,
      proof_url: proofUrl,
    });
    setSubmitting(false);
    if ('error' in result) {
      setSubmitError(result.error);
      return;
    }
    if (isItemFlow) {
      markListingReported(listingId);
    }
    setStep(3);
  };

  const handleBlockUser = async () => {
    if (reportedUserId && userId) {
      await blockUser(userId, reportedUserId);
    }
    router.push('/safety');
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      setProofFile(file);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        router.push('/safety');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    };
  }, [proofPreviewUrl]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader
        onBack={handleBack}
        className="bg-transparent border-b-0"
        right={
          step !== 3 ? (
            <button
              onClick={() => router.push('/safety')}
              className="text-[10px] font-bold tracking-widest text-relay-muted hover:text-primary transition-colors"
            >
              Cancel
            </button>
          ) : undefined
        }
      >
        <h1 className="text-2xl font-serif text-relay-text dark:text-relay-text-dark tracking-tighter">Report Issue</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-10 pb-20">
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-light text-relay-text dark:text-relay-text-dark mb-8 px-2 leading-relaxed">
              Why are you reporting this member? <br/>
              <span className="text-relay-muted text-xs ">All reports are confidential and reviewed by our safety team.</span>
            </h2>
            <div className="space-y-3">
              {reportReasons.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setReason(item.label); setStep(2); }}
                  className="w-full flex items-center justify-between p-6 rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark hover:border-primary/50 transition-all text-left group active-scale"
                >
                  <div className="flex items-center gap-5">
                    <span className="material-symbols-outlined text-primary/60 group-hover:text-primary transition-colors">{item.icon}</span>
                    <span className="text-sm text-relay-text dark:text-relay-text-dark font-light group-hover:font-medium transition-all">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-relay-muted group-hover:text-primary transition-colors">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-[10px] font-bold tracking-widest text-primary">Selected Reason</p>
                <button
                  onClick={() => {
                    if (isItemFlow) {
                      const base = `/report/item?listingId=${encodeURIComponent(
                        listingId ?? '',
                      )}${reportedUserId ? `&userId=${encodeURIComponent(reportedUserId)}` : ''}`;
                      router.push(base);
                    } else {
                      setStep(1);
                    }
                  }}
                  className="text-[10px] font-bold tracking-widest text-relay-muted hover:text-relay-text transition-colors"
                >
                  Change
                </button>
              </div>
              <div className="p-5 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark text-sm">
                {reason}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold tracking-widest text-relay-muted px-1">Additional Details</label>
              <textarea 
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe the situation in detail..."
                className="w-full h-40 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-3xl p-6 text-relay-text dark:text-relay-text-dark text-sm focus:ring-1 focus:ring-primary/30 transition-all placeholder-relay-muted/40 leading-relaxed "
              />
              <p className="text-[9px] text-relay-muted tracking-widest text-right  px-1">Minimum 20 characters required</p>
            </div>

            {!isItemFlow && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-widest text-relay-muted px-1">
                  Attach Proof (Required)
                </label>
                <label className="w-full h-14 border border-dashed border-relay-border dark:border-relay-border-dark rounded-2xl flex items-center justify-center gap-3 text-relay-muted hover:text-relay-text transition-all active-scale cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    className="sr-only"
                  />
                  <span className="material-symbols-outlined">attach_file</span>
                  <span className="text-[10px] font-bold tracking-widest">Upload Screenshot</span>
                </label>
                {proofPreviewUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-relay-border dark:border-relay-border-dark max-h-48">
                    <img
                      src={proofPreviewUrl}
                      alt="Proof screenshot"
                      className="w-full h-auto object-contain max-h-48"
                    />
                  </div>
                )}
                <p className="text-[9px] text-relay-muted tracking-widest text-right px-1">
                  Screenshot required
                </p>
              </div>
            )}

            {submitError && (
              <p className="text-xs text-relay-text dark:text-relay-text-dark/80" role="alert">
                {submitError}
              </p>
            )}
            <div className="pt-4 space-y-4">
              <button 
                onClick={handleSubmit}
                disabled={details.length < 20 || !proofFile || submitting}
                className={`w-full h-8 rounded-2xl font-semibold text-xs tracking-[0.1em] transition-all active-scale ${details.length >= 20 && proofFile && !submitting ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:opacity-90' : 'bg-relay-bg dark:bg-relay-bg-dark text-relay-muted opacity-40 border border-relay-border dark:border-relay-border-dark cursor-not-allowed'}`}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
              <button 
                onClick={() => setStep(1)}
                className="w-full h-8 text-[10px] font-bold tracking-widest text-relay-muted hover:text-relay-text transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-8 shadow-xl shadow-primary/5">
              <span className="material-symbols-outlined text-primary !text-5xl">task_alt</span>
            </div>
            <h2 className="text-3xl font-serif  text-relay-text dark:text-relay-text-dark mb-4 tracking-tighter">Report Submitted</h2>
            <p className="text-sm text-relay-muted dark:text-relay-muted-light font-light max-w-[240px] leading-relaxed mb-12 ">
              Our support team has received your report. We will review it within 24 hours. Thank you for keeping Rellaey safe.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={() => router.push('/safety')}
                className="px-12 py-5 rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-xs font-semibold tracking-[0.1em] text-relay-text dark:text-relay-text-dark hover:bg-primary hover:text-white hover:border-primary transition-all active-scale"
              >
                Return to Safety Center
              </button>
              {reportedUserId && (
                <button 
                  onClick={handleBlockUser}
                  className="px-12 py-5 rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-xs font-semibold tracking-[0.1em] text-relay-text dark:text-relay-text-dark hover:bg-primary hover:text-white hover:border-primary transition-all active-scale"
                >
                  Block this user
                </button>
              )}
            </div>
            <div className="mt-12 flex flex-col items-center gap-3">
              <p className="text-[9px] text-relay-muted tracking-[0.4em] opacity-40">Auto-redirecting...</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportPageContent />
    </Suspense>
  );
}
