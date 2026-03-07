'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile, type Profile } from '@/lib/profiles';
import { type } from '@/lib/typography';
import { getDefaultAvatar } from '@/lib/avatars';
import { EditProfileIcon } from '@/app/components/EditProfileIcon';
import { NotificationIcon } from '@/app/components/NotificationIcon';
import { GuidelinesIcon } from '@/app/components/GuidelinesIcon';
import { PaymentIcon } from '@/app/components/PaymentIcon';
import { PrivacyIcon } from '@/app/components/PrivacyIcon';
import { AvailabilityIcon } from '@/app/components/AvailabilityIcon';
import { AppearanceIcon } from '@/app/components/AppearanceIcon';
import { ResetPasswordIcon } from '@/app/components/ResetPasswordIcon';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type SectionItem = {
  label: string;
  icon: string;
  image?: string;
  path?: string;
  highlight?: boolean;
  type?: 'toggle';
  iconComponent?: React.ComponentType<{ className?: string }>;
};

type Section = {
  title: string;
  items: SectionItem[];
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const p = await fetchProfile(user.id);
      if (!cancelled) setProfile(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const toggleTheme = () => {
    if (typeof window === 'undefined') return;
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    });
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const sections: Section[] = [
    {
      title: 'Account',
      items: [
        { label: 'Personal Info', icon: 'person_edit', path: '/edit-profile', iconComponent: EditProfileIcon },
        { label: 'Notifications', icon: 'notifications', path: '/settings/notifications', iconComponent: NotificationIcon },
        { label: 'Privacy & Safety', icon: 'shield', path: '/safety', iconComponent: PrivacyIcon },
        { label: 'Availability', icon: 'schedule', path: '/settings/availability', iconComponent: AvailabilityIcon },
        { label: 'Reset password', icon: 'lock_reset', path: '/forgot-password?from=settings', iconComponent: ResetPasswordIcon },
        { label: 'Appearance', icon: 'dark_mode', type: 'toggle', iconComponent: AppearanceIcon },
      ]
    },
    {
      title: 'Subscription',
      items: [
        { label: 'Manage Rellaey+ Plan', icon: 'military_tech', path: '/pricing', highlight: true },
        { label: 'Wallet', icon: 'credit_card', path: '/wallet', iconComponent: PaymentIcon },
      ]
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: 'help', path: '/help' },
        { label: 'Community Guidelines', icon: 'gavel', path: '/guidelines', iconComponent: GuidelinesIcon },
        { label: 'About Rellaey', icon: 'info', path: '/about' },
      ]
    }
  ];

  const displayName = profile?.display_name ?? 'User';
  const avatarUrl = profile?.avatar_url || getDefaultAvatar(profile?.id ?? displayName);
  const isRelayPlus = profile?.membership_tier === 'relay_plus';

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 border-b border-relay-border dark:border-relay-border-dark flex items-center gap-4 bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Settings</h1>
      </header>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-8 pb-20">
        <div className="p-6 rounded-[32px] bg-relay-bg dark:bg-relay-bg-dark mb-10 flex items-center gap-5 shadow-sm">
          {loading ? (
            <div className="size-16 rounded-full bg-relay-surface dark:bg-relay-surface-dark animate-pulse" />
          ) : (
            <div className="size-16 rounded-full overflow-hidden border-2 border-primary/20 p-1">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-5 w-32 bg-relay-surface dark:bg-relay-surface-dark rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-lg font-bold text-relay-text dark:text-relay-text-dark truncate">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {isRelayPlus && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[8px] font-bold tracking-widest border border-primary/20">Rellaey+ Member</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-[0.3em] text-relay-muted px-2">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isToggle = item.type === 'toggle';
                  const IconComponent = item.iconComponent ?? null;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (isToggle) {
                          toggleTheme();
                        } else if (item.path) {
                          router.push(item.path);
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors group"
                      type="button"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-xl flex items-center justify-center border transition-all ${item.highlight ? 'border-transparent bg-primary/5 text-primary shadow-lg shadow-primary/5' : 'border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark text-relay-muted group-hover:text-relay-text dark:group-hover:text-relay-text-dark'}`}>
                          {IconComponent ? (
                            <IconComponent className="size-6 shrink-0 text-current" />
                          ) : item.type === 'toggle' && item.image ? (
                            <img
                              key={isDarkMode ? 'appearance-on' : 'appearance-off'}
                              src={isDarkMode ? '/icons/settings-appearance-on.svg' : '/icons/settings-appearance-off.svg'}
                              alt=""
                              className={`size-6 object-contain ${isDarkMode ? 'dark:invert' : ''}`}
                            />
                          ) : item.image ? (
                            <img src={item.image} alt="" className="size-6 object-contain dark:invert" />
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                          )}
                        </div>
                        <span className={`text-sm font-medium tracking-tighter ${item.highlight ? 'text-relay-text dark:text-relay-text-dark' : 'text-relay-muted group-hover:text-relay-text dark:group-hover:text-relay-text-dark'}`}>{item.label}</span>
                      </div>
                      {isToggle ? (
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            isDarkMode ? 'bg-primary' : 'bg-relay-border dark:bg-relay-border-dark'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                              isDarkMode ? 'translate-x-5' : ''
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="material-symbols-outlined text-relay-border dark:text-relay-border-dark group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 px-2 text-center">
          <button
            onClick={handleLogout}
            className="text-primary text-xs font-semibold tracking-tight hover:text-primary/80 transition-colors"
          >
            Log out
          </button>
          <p className="mt-8 text-center text-[9px] text-relay-muted font-bold tracking-tight opacity-40">
            Rellaey Version 2.4.0 (Gold)
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
