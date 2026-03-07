'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile, updateNotificationPrefs } from '@/lib/profiles';

type PrefKey = 'notify_messages' | 'notify_swaps' | 'notify_pickup_30_min' | 'notify_pickup_15_min';

const TOGGLES: { key: PrefKey; label: string }[] = [
  { key: 'notify_messages', label: 'Messages' },
  { key: 'notify_swaps', label: 'Swaps' },
  { key: 'notify_pickup_30_min', label: 'Pickup reminder (30 min before)' },
  { key: 'notify_pickup_15_min', label: 'Pickup reminder (15 min before)' },
];

const DEFAULTS: Record<PrefKey, boolean> = {
  notify_messages: true,
  notify_swaps: true,
  notify_pickup_30_min: true,
  notify_pickup_15_min: false,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PrefKey | null>(null);

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
      const profile = await fetchProfile(user.id);
      if (cancelled) return;
      if (profile) {
        setPrefs({
          notify_messages: profile.notify_messages ?? DEFAULTS.notify_messages,
          notify_swaps: profile.notify_swaps ?? DEFAULTS.notify_swaps,
          notify_pickup_30_min: profile.notify_pickup_30_min ?? DEFAULTS.notify_pickup_30_min,
          notify_pickup_15_min: profile.notify_pickup_15_min ?? DEFAULTS.notify_pickup_15_min,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (key: PrefKey) => {
    if (!profileId) return;
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setSaving(key);
    const { error } = await updateNotificationPrefs(profileId, { [key]: next });
    setSaving(null);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !next }));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 flex items-center gap-4 bg-transparent z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter">Notifications</h1>
      </header>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-8 pb-20 space-y-8">
        <p className="text-relay-muted dark:text-relay-muted-light text-sm">
          Choose what you want to be notified about.
        </p>
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold tracking-[0.3em] text-relay-muted px-2">Preferences</h3>
          <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark overflow-hidden divide-y divide-relay-border dark:divide-relay-border-dark">
            {TOGGLES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleToggle(key)}
                disabled={!profileId || loading || saving !== null}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-relay-surface dark:hover:bg-relay-surface-dark transition-colors disabled:opacity-60"
              >
                <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark">{label}</span>
                <div className="flex items-center gap-2">
                  {saving === key && (
                    <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  )}
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      prefs[key] ? 'bg-primary' : 'bg-relay-border dark:bg-relay-border-dark'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-relay-bg dark:bg-relay-bg-dark shadow transition-transform ${
                        prefs[key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
