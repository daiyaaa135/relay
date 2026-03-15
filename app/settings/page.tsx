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
import { ChevronIcon } from '@/app/components/ChevronIcon';
import { PageHeader } from '@/app/components/PageHeader';

function SunIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g clipPath="url(#sun-clip)">
        <path d="M12.75 1C12.75 0.585786 12.4142 0.25 12 0.25C11.5858 0.25 11.25 0.585786 11.25 1V3C11.25 3.41421 11.5858 3.75 12 3.75C12.4142 3.75 12.75 3.41421 12.75 3V1Z" fill="currentColor"/>
        <path d="M4.75216 3.69149C4.45926 3.3986 3.98439 3.3986 3.6915 3.69149C3.3986 3.98439 3.3986 4.45926 3.6915 4.75216L5.10571 6.16637C5.3986 6.45926 5.87348 6.45926 6.16637 6.16637C6.45926 5.87348 6.45926 5.3986 6.16637 5.10571L4.75216 3.69149Z" fill="currentColor"/>
        <path d="M20.3085 4.75216C20.6014 4.45926 20.6014 3.98439 20.3085 3.6915C20.0156 3.3986 19.5407 3.3986 19.2478 3.69149L17.8336 5.10571C17.5407 5.3986 17.5407 5.87348 17.8336 6.16637C18.1265 6.45926 18.6014 6.45926 18.8943 6.16637L20.3085 4.75216Z" fill="currentColor"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 5.25C8.27208 5.25 5.25 8.27208 5.25 12C5.25 15.7279 8.27208 18.75 12 18.75C15.7279 18.75 18.75 15.7279 18.75 12C18.75 8.27208 15.7279 5.25 12 5.25ZM6.75 12C6.75 9.1005 9.1005 6.75 12 6.75C14.8995 6.75 17.25 9.1005 17.25 12C17.25 14.8995 14.8995 17.25 12 17.25C9.1005 17.25 6.75 14.8995 6.75 12Z" fill="currentColor"/>
        <path d="M1 11.25C0.585786 11.25 0.25 11.5858 0.25 12C0.25 12.4142 0.585786 12.75 1 12.75H3C3.41421 12.75 3.75 12.4142 3.75 12C3.75 11.5858 3.41421 11.25 3 11.25H1Z" fill="currentColor"/>
        <path d="M21 11.25C20.5858 11.25 20.25 11.5858 20.25 12C20.25 12.4142 20.5858 12.75 21 12.75H23C23.4142 12.75 23.75 12.4142 23.75 12C23.75 11.5858 23.4142 11.25 23 11.25H21Z" fill="currentColor"/>
        <path d="M6.16637 18.8943C6.45926 18.6014 6.45926 18.1265 6.16637 17.8336C5.87348 17.5407 5.3986 17.5407 5.10571 17.8336L3.6915 19.2478C3.3986 19.5407 3.3986 20.0156 3.6915 20.3085C3.98439 20.6014 4.45926 20.6014 4.75216 20.3085L6.16637 18.8943Z" fill="currentColor"/>
        <path d="M18.8943 17.8336C18.6014 17.5407 18.1265 17.5407 17.8336 17.8336C17.5407 18.1265 17.5407 18.6014 17.8336 18.8943L19.2478 20.3085C19.5407 20.6014 20.0156 20.6014 20.3085 20.3085C20.6014 20.0156 20.6014 19.5407 20.3085 19.2478L18.8943 17.8336Z" fill="currentColor"/>
        <path d="M12.75 21C12.75 20.5858 12.4142 20.25 12 20.25C11.5858 20.25 11.25 20.5858 11.25 21V23C11.25 23.4142 11.5858 23.75 12 23.75C12.4142 23.75 12.75 23.4142 12.75 23V21Z" fill="currentColor"/>
      </g>
      <defs>
        <clipPath id="sun-clip">
          <rect width="24" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

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
    import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    }).catch(() => {
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
        { label: 'Reset password', icon: 'lock_reset', path: '/reset-password', iconComponent: ResetPasswordIcon },
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
      <PageHeader>
        <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Settings</h1>
      </PageHeader>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 pt-0 pb-20">
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
              <h3 className="text-[10px] font-bold tracking-normal text-relay-muted px-2">{section.title}</h3>
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
                            isToggle
                              ? isDarkMode
                                ? <SunIcon className="size-6 shrink-0 text-current" />
                                : <IconComponent className="size-6 shrink-0 text-current" />
                              : <IconComponent className="size-6 shrink-0 text-current" />
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
