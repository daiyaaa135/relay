'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchMySwaps } from '@/lib/swaps';
import { fetchGadgetsByProfileId } from '@/lib/gadgets';

const PENDING_SWAP_STATUSES = ['pending', 'confirmed', 'pickup_arranged'];

export default function CloseAccountRequestPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    email: '',
  });
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    setSubmitError(null);
    setCheckingEligibility(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSubmitError('Please sign in to request account closure.');
        setCheckingEligibility(false);
        return;
      }

      const [swaps, activeListings] = await Promise.all([
        fetchMySwaps(user.id),
        fetchGadgetsByProfileId(user.id, 'active'),
      ]);
      const hasPendingSwap = swaps.some((s) => PENDING_SWAP_STATUSES.includes(s.status));
      const hasActiveListing = activeListings.length > 0;

      if (hasPendingSwap || hasActiveListing) {
        setShowRejectionModal(true);
      } else {
        setShowConfirmModal(true);
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSubmitError('Session expired. Please sign in again.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/help/close-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: form.email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data?.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      setShowConfirmModal(false);
      await supabase.auth.signOut();
      router.push('/?closed=account');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <div className="page-scroll">
      <header
        className="sticky top-0 px-6 pb-4 border-b border-relay-border dark:border-relay-border-dark flex items-center justify-between bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30 pt-safe-3"
      >
        <button
          type="button"
          onClick={() => router.push('/help')}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Back to help"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex-1 flex flex-col items-center -ml-10">
          <h1 className="text-xs font-semibold tracking-tight text-primary uppercase">
            Rellaey Help
          </h1>
        </div>
        <div className="w-10" aria-hidden />
      </header>

      <main className="px-6 pt-6 pb-20">
        <button
          type="button"
          onClick={() => router.push('/help')}
          className="flex items-center text-xs text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark gap-1 mb-6"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to help home</span>
        </button>

        <h2 className="text-xl font-semibold text-relay-text dark:text-relay-text-dark mb-6">
          Request Form for Close Your Account
        </h2>

        <div className="space-y-6 text-sm leading-relaxed text-relay-text dark:text-relay-text-dark mb-8">
          <p>
            We have processes in place to ensure that we respond promptly to these requests. To protect the personal information of our customers, we are required to verify your identity before fulfilling any requests for access to your personal information, and we only fulfill requests for the personal data associated with what you identify in this form.
          </p>
          <p>
            Requests submitted with this form are secure and the data is not saved. If you would like to submit a request for another account, please open a separate request with that information.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
            Please enter the information contained on your account below so we can locate your records.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-relay-muted dark:text-relay-muted-light mb-1.5">Account Email Address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm placeholder:text-relay-muted focus:ring-2 focus:ring-primary/30 focus:outline-none"
                placeholder="Account Email Address"
              />
            </label>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
              By submitting this request, I am confirming the following:
            </p>
            <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark p-4 space-y-3 text-xs leading-relaxed text-relay-text dark:text-relay-text-dark">
              <p>(1) <strong>Accuracy:</strong> the information I have provided is true and accurate;</p>
              <p>(2) <strong>Privacy:</strong> that I understand the information will be handled by Rellaey Inc in accordance with its Privacy Policy;</p>
              <p>(3) <strong>Contact:</strong> that Rellaey Inc has the right to contact me to verify my identity and to process this request.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 size-4 rounded border-relay-border dark:border-relay-border-dark text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-relay-text dark:text-relay-text-dark">
                I have read and agree to the above.
              </span>
            </label>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={!confirmed || checkingEligibility}
            className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold tracking-tight disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            {checkingEligibility ? 'Checking…' : 'Submit request'}
          </button>
        </form>
      </main>
      </div>

      {/* Rejection: pending swaps or active listings */}
      {showRejectionModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-relay-bg/80 dark:bg-relay-bg-dark/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejection-modal-title"
          onClick={() => setShowRejectionModal(false)}
        >
          <div
            className="rounded-2xl bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark p-6 shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="rejection-modal-title" className="text-lg font-semibold text-relay-text dark:text-relay-text-dark mb-3">
              Unable to close account
            </h3>
            <p className="text-sm text-relay-text dark:text-relay-text-dark mb-6">
              We&apos;re unable to close your account at this time. You have pending swaps and active listings that must be resolved first.
            </p>
            <button
              type="button"
              onClick={() => setShowRejectionModal(false)}
              className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirmation: are you sure? */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-6 bg-relay-bg/80 dark:bg-relay-bg-dark/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <div
            className="rounded-2xl bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark p-6 shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-relay-text dark:text-relay-text-dark mb-3">
              Delete your account?
            </h3>
            <p className="text-sm text-relay-text dark:text-relay-text-dark mb-6">
              Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be lost forever.
            </p>
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
                {submitError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !submitting && setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 h-12 rounded-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
