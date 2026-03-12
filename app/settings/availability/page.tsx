'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchAvailability, saveAvailability, type AvailabilitySlot, EARLIEST_MINUTES, LATEST_MINUTES, MIN_AVAILABLE_MINUTES, computeTotalMinutes, isSlotWithinBounds } from '@/lib/availability';
import { PageHeader } from '@/app/components/PageHeader';

type DayConfig = {
  label: string;
  /** 0 = Sunday, 6 = Saturday (matches AvailabilitySlot.dayOfWeek) */
  value: number;
};

type DayState = {
  enabled: boolean;
  ranges: { id?: string; start: string; end: string }[];
};

const DAY_CONFIGS: DayConfig[] = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

type TimeOption = { value: string; label: string };

function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let minutes = EARLIEST_MINUTES; minutes <= LATEST_MINUTES; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const hour12 = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? 'AM' : 'PM';
    const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    options.push({ value, label });
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function createEmptyDay(): DayState {
  return { enabled: false, ranges: [] };
}

function minutesLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours} hr ${mins} min`;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const base: Record<number, DayState> = {};
    DAY_CONFIGS.forEach((d) => {
      base[d.value] = createEmptyDay();
    });
    return base;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setProfileId(user.id);
      const slots = await fetchAvailability(user.id);
      if (cancelled) return;
      if (slots.length > 0) {
        setDays((prev) => {
          const next: Record<number, DayState> = { ...prev };
          const grouped: Record<number, AvailabilitySlot[]> = {};
          slots.forEach((slot) => {
            if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
            grouped[slot.dayOfWeek].push(slot);
          });
          Object.entries(grouped).forEach(([day, arr]) => {
            next[Number(day)] = {
              enabled: true,
              ranges: arr.map((s) => ({ id: s.id, start: s.start, end: s.end })),
            };
          });
          return next;
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flatSlots: AvailabilitySlot[] = useMemo(() => {
    const slots: AvailabilitySlot[] = [];
    for (const { value } of DAY_CONFIGS) {
      const state = days[value];
      if (!state?.enabled) continue;
      state.ranges.forEach((r) => {
        if (!r.start || !r.end) return;
        slots.push({ id: r.id, dayOfWeek: value, start: r.start, end: r.end });
      });
    }
    return slots;
  }, [days]);

  const totalMinutes = useMemo(() => computeTotalMinutes(flatSlots), [flatSlots]);
  const hasOutOfBoundsOrInvalid = useMemo(
    () => flatSlots.some((s) => !isSlotWithinBounds(s)),
    [flatSlots],
  );

  const onboarding = searchParams.get('onboarding') === '1' || searchParams.get('from') === 'list';

  const handleSyncCalendar = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const ok = res.ok;
      let data: { redirectUrl?: string } | null = null;
      if (ok) {
        data = (await res.json()) as { redirectUrl?: string };
      }
      if (ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      // ignore errors
    }
  };

  const handleFillFromCalendar = async () => {
    try {
      setSyncing(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSyncing(false);
        return;
      }
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        setSyncing(false);
        return;
      }
      const data = (await res.json()) as { slots?: AvailabilitySlot[] };
      if (data.slots && Array.isArray(data.slots)) {
        const next: Record<number, DayState> = {};
        DAY_CONFIGS.forEach((d) => {
          next[d.value] = createEmptyDay();
        });
        data.slots.forEach((slot) => {
          const day = slot.dayOfWeek;
          if (!next[day]) next[day] = createEmptyDay();
          const state = next[day];
          state.enabled = true;
          state.ranges.push({ start: slot.start, end: slot.end });
        });
        setDays(next);
      }
      setSyncing(false);
    } catch {
      setSyncing(false);
    }
  };

  const handleToggleDay = (dayValue: number) => {
    setDays((prev) => {
      const current = prev[dayValue] ?? createEmptyDay();
      const enabled = !current.enabled;
      if (!enabled) {
        return { ...prev, [dayValue]: createEmptyDay() };
      }
      // When enabling a day with no ranges yet, seed with a default evening window.
      const defaultRange = { start: '17:30', end: '20:00' };
      const ranges = current.ranges.length > 0 ? current.ranges : [defaultRange];
      return { ...prev, [dayValue]: { enabled: true, ranges } };
    });
  };

  const handleRangeChange = (dayValue: number, index: number, field: 'start' | 'end', value: string) => {
    setDays((prev) => {
      const current = prev[dayValue] ?? createEmptyDay();
      const ranges = [...current.ranges];
      if (!ranges[index]) ranges[index] = { start: '17:30', end: '20:00' };
      ranges[index] = { ...ranges[index], [field]: value };
      return { ...prev, [dayValue]: { ...current, enabled: true, ranges } };
    });
  };

  const handleAddRange = (dayValue: number) => {
    setDays((prev) => {
      const current = prev[dayValue] ?? createEmptyDay();
      const ranges = current.ranges.length > 0
        ? [...current.ranges, { start: current.ranges[current.ranges.length - 1].end, end: '20:00' }]
        : [{ start: '17:30', end: '20:00' }];
      return { ...prev, [dayValue]: { enabled: true, ranges } };
    });
  };

  const handleRemoveRange = (dayValue: number, index: number) => {
    setDays((prev) => {
      const current = prev[dayValue] ?? createEmptyDay();
      const ranges = current.ranges.filter((_, i) => i !== index);
      return { ...prev, [dayValue]: { enabled: ranges.length > 0, ranges } };
    });
  };

  const handleSave = async () => {
    if (!profileId) return;
    setError(null);

    if (flatSlots.length === 0) {
      setError('Add at least one time range before saving.');
      return;
    }
    if (hasOutOfBoundsOrInvalid) {
      setError('Each time range must be between 9:30 am and 8:00 pm, and the end time must be after the start time.');
      return;
    }
    if (totalMinutes < MIN_AVAILABLE_MINUTES) {
      setError('Add at least 6 hours of availability across your week between 9:30 am and 8:00 pm.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await saveAvailability(profileId, flatSlots);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }

    if (onboarding) {
      // Scenario 1: user had no availability when they listed; award credits now after they confirmed availability
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('relay_pending_listing_credit') : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { gadgetId?: string; credits?: number };
          const { gadgetId, credits } = parsed;
          if (gadgetId && typeof credits === 'number' && credits > 0) {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const creditRes = await fetch('/api/credits/listing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ gadgetId, credits }),
              });
              if (creditRes.ok) sessionStorage.removeItem('relay_pending_listing_credit');
            }
          }
        }
      } catch {
        // ignore parse/storage errors
      }
      router.push('/?listed=1');
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <PageHeader>
        <h1 className="text-2xl font-serif text-relay-text dark:text-relay-text-dark tracking-tighter">
          Availability
        </h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20 space-y-8 max-w-md mx-auto w-full">
        <div className="space-y-2">
          <p className="text-sm text-relay-muted dark:text-relay-muted-light">
            Select time slots when you&apos;re available for meet ups. Buyers will only be able to propose
            pickups within these windows.
          </p>
          <p className="text-xs text-relay-muted dark:text-relay-muted-light">
            Hours must be between <span className="font-semibold">9:30 am</span> and{' '}
            <span className="font-semibold">8:00 pm</span>. To list, you need at least{' '}
            <span className="font-semibold">6 hours</span> total each week.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleSyncCalendar}
            className="w-full max-w-[50%] h-8 rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-bg dark:bg-relay-bg-dark text-sm font-medium text-relay-text dark:text-relay-text-dark hover:bg-relay-border/20 dark:hover:bg-relay-border-dark/20 transition-colors flex items-center justify-center gap-2 active-scale"
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            Sync my calendar
          </button>
          <button
            type="button"
            onClick={handleFillFromCalendar}
            disabled={syncing}
            className="w-full max-w-[50%] h-8 rounded-xl border border-dashed border-relay-border dark:border-relay-border-dark text-xs font-medium text-relay-muted dark:text-relay-muted-light disabled:opacity-50 disabled:cursor-not-allowed hover:text-relay-text dark:hover:text-relay-text-dark hover:border-relay-text dark:hover:border-relay-text-dark transition-colors"
          >
            {syncing ? 'Filling from calendar…' : 'Fill from calendar'}
          </button>
        </div>

        <div className="rounded-3xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark divide-y divide-relay-border dark:divide-relay-border-dark overflow-hidden">
          {DAY_CONFIGS.map(({ label, value }) => {
            const state = days[value] ?? createEmptyDay();
            return (
              <div key={value} className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleDay(value)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    aria-pressed={state.enabled}
                  >
                    <div
                      className={`absolute inset-0 rounded-full transition-colors ${
                        state.enabled ? 'bg-primary' : 'bg-[#E2E2E3]'
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-relay-bg dark:bg-relay-bg-dark shadow-sm transition-transform ${
                        state.enabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {state.enabled && (
                  <div className="space-y-3 pl-1">
                    {state.ranges.map((range, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={range.start}
                          onChange={(e) => handleRangeChange(value, idx, 'start', e.target.value)}
                          className="flex-1 h-8 rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark px-3 text-sm text-relay-text dark:text-relay-text-dark"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-relay-muted dark:text-relay-muted-light text-xs">–</span>
                        <select
                          value={range.end}
                          onChange={(e) => handleRangeChange(value, idx, 'end', e.target.value)}
                          className="flex-1 h-8 rounded-xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark px-3 text-sm text-relay-text dark:text-relay-text-dark"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {state.ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRange(value, idx)}
                            className="p-1 rounded-full text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark"
                            aria-label="Remove time range"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddRange(value)}
                      className="w-full max-w-[50%] mx-auto h-8 rounded-xl border border-dashed border-relay-border dark:border-relay-border-dark text-xs font-medium text-relay-muted dark:text-relay-muted-light hover:text-relay-text dark:hover:text-relay-text-dark hover:border-relay-text dark:hover:border-relay-text-dark"
                    >
                      Add more
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-relay-muted dark:text-relay-muted-light">
            Total weekly availability:{' '}
            <span className="font-semibold text-relay-text dark:text-relay-text-dark">
              {minutesLabel(totalMinutes)}
            </span>
          </p>
          {error && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {error}
            </p>
          )}
        </div>

        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={!profileId || saving}
            className="h-8 px-8 rounded-2xl bg-primary text-white text-xs font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed active-scale flex items-center justify-center"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

