'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { createClient } from '@/lib/supabase';
import { ListingProvider, useListing } from '@/app/list/ListingContext';
import { HomeIcon } from '@/app/components/HomeIcon';
import { MessagesNavIcon } from '@/app/components/MessagesNavIcon';
import { MoreNavIcon } from '@/app/components/MoreNavIcon';
import { WishlistNavIcon } from '@/app/components/WishlistNavIcon';
import { usePushNotifications } from '@/hooks/usePushNotifications';
// import SplashScreen from '@/app/components/SplashScreen';

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const listing = useListing();
  const { requestLeave, hasProgress } = listing;
  const listStepMatch = pathname.match(/^\/list\/(\d+)$/);
  const listStep = listStepMatch ? parseInt(listStepMatch[1], 10) : 1;
  const isOnListWithProgress = pathname.startsWith('/list') && hasProgress(listStep);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || cancelled) return;

      // Find swaps where this user is buyer or seller
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_profile_id.eq.${user.id},seller_profile_id.eq.${user.id}`);

      if (!convs || cancelled) return;
      const convIds = convs.map((c: { id: string }) => c.id);
      if (convIds.length === 0) return;

      const { data: unread } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', convIds)
        .neq('sender_profile_id', user.id)
        .is('read_at', null)
        .limit(1);

      if (!cancelled) setHasUnreadMessages(!!(unread && unread.length > 0));
    };

    check();
    // Re-check when window gains focus
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname]);

  const navItems = [
    { label: 'Home', icon: 'home', path: '/', iconComponent: HomeIcon },
    { label: 'Wishlist', icon: 'favorite', path: '/wishlist', iconComponent: WishlistNavIcon },
    { label: 'Swap', icon: 'swap_horiz', path: '/list', center: true },
    { label: 'Messages', icon: 'chat_bubble', path: '/messages', iconComponent: MessagesNavIcon, badge: hasUnreadMessages },
    { label: 'More', icon: 'menu', path: '/more', iconComponent: MoreNavIcon },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 glass-card border-t border-relay-border dark:border-relay-border-dark px-6 pt-1"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) * 0.4)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
    >
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const NavIconComponent = 'iconComponent' in item ? item.iconComponent : null;
          if (item.center) {
            return (
              <div key={item.path} className="relative -top-6">
                <button
                  type="button"
                  onClick={() => router.push(item.path)}
                  className="listing-nav-button size-12 rounded-full flex items-center justify-center border border-transparent active-scale transition-transform"
                >
                  <span className="material-symbols-outlined text-white text-3xl">{item.icon}</span>
                </button>
              </div>
            );
          }
          const isActive = pathname === item.path;
          const showHighlight = isActive;
          const hasBadge = 'badge' in item && item.badge;
          const navigateAway = isOnListWithProgress && item.path !== pathname && item.path !== '/list';
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={(e) => {
                if (navigateAway) {
                  e.preventDefault();
                  requestLeave(() => router.push(item.path));
                }
              }}
              className={`group flex flex-col items-center gap-0 transition-colors ${
                isActive
                  ? 'text-relay-text dark:text-relay-text-dark'
                  : 'text-relay-muted dark:text-relay-text-dark/70 hover:text-relay-text dark:hover:text-relay-text-dark'
              }`}
            >
              <div
                className={`relative rounded-full p-2 transition-all ${
                  showHighlight
                    ? 'bg-relay-surface dark:bg-relay-input-dark'
                    : 'group-hover:bg-relay-surface dark:group-hover:bg-relay-input-dark'
                }`}
                style={{ minWidth: 14, minHeight: 14, margin: 2 }}
              >
                {NavIconComponent ? (
                  <NavIconComponent
                    className={`size-6 shrink-0 text-current ${isActive ? 'opacity-100' : 'opacity-60 dark:opacity-90'}`}
                  />
                ) : 'image' in item && typeof item.image === 'string' && item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className={`size-6 object-contain ${isActive ? 'opacity-100' : 'opacity-60 dark:opacity-90'} ${'noInvert' in item && item.noInvert ? '' : 'dark:invert'}`}
                  />
                ) : (
                  <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                )}
                {hasBadge && (
                  <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-relay-text dark:bg-relay-text-dark border-2 border-relay-surface dark:border-relay-surface-dark" />
                )}
              </div>
              <span className={`text-[10px] font-normal tracking-tighter transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const hideNavPaths = ['/login', '/signup'];
  const mainRef = React.useRef<HTMLElement>(null);
  const router = useRouter();
  // const [showSplash, setShowSplash] = useState(false); // splash disabled

  useEffect(() => {
    const cleanup = usePushNotifications(router);
    return () => {
      cleanup && cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide native Capacitor splash when app is ready (first paint)
  useEffect(() => {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
    const hide = async () => {
      try {
        await SplashScreen.hide();
      } catch {
        // ignore if plugin not available
      }
    };
    // Small delay so first frame has painted
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hide();
      });
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // Global error + unhandled rejection logging (debug instrumentation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const logEndpoint = 'http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307';

    const handleError = (event: ErrorEvent) => {
      // #region agent log
      fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_global_error`,
          runId: 'pre-fix',
          hypothesisId: 'H-global-js-error',
          location: 'app/components/Layout.tsx:globalError',
          message: 'window.error',
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error && typeof event.error === 'object' ? (event.error as Error).stack : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log

      // #region agent log proxy
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_global_error_proxy`,
          runId: 'pre-fix',
          hypothesisId: 'H-global-js-error',
          location: 'app/components/Layout.tsx:globalError',
          message: 'window.error',
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log proxy
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_unhandled_rejection`,
          runId: 'pre-fix',
          hypothesisId: 'H-global-js-error',
          location: 'app/components/Layout.tsx:unhandledRejection',
          message: 'unhandledrejection',
          data: {
            reason:
              event.reason && typeof event.reason === 'object'
                ? {
                    name: (event.reason as Error).name,
                    message: (event.reason as Error).message,
                    stack: (event.reason as Error).stack,
                  }
                : String(event.reason),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log

      // #region agent log proxy
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_unhandled_rejection_proxy`,
          runId: 'pre-fix',
          hypothesisId: 'H-global-js-error',
          location: 'app/components/Layout.tsx:unhandledRejection',
          message: 'unhandledrejection',
          data: {
            reason:
              event.reason && typeof event.reason === 'object'
                ? {
                    name: (event.reason as Error).name,
                    message: (event.reason as Error).message,
                  }
                : String(event.reason),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log proxy
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // One-time per-session splash screen on home route (disabled)
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;
  //   if (pathname !== '/') return;
  //   try {
  //     if (sessionStorage.getItem('splashShown')) return;
  //     sessionStorage.setItem('splashShown', 'true');
  //     setShowSplash(true);
  //   } catch {
  //     // ignore
  //   }
  // }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Listen for a generic native pull-to-refresh event dispatched by the iOS host app.
  // Native code should dispatch `window.dispatchEvent(new Event('nativeRefresh'))`
  // when the user triggers pull-to-refresh in the WebView.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => {
      router.refresh();
    };

    window.addEventListener('nativeRefresh', handleRefresh);
    return () => {
      window.removeEventListener('nativeRefresh', handleRefresh);
    };
  }, [router]);

  // Enable native pull-to-refresh in the Capacitor WebView (iOS/Android only).
  // This operates at the WebView level and emits a custom event when the user pulls down.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const handler = () => {
      // Trigger a soft data refresh for the current route.
      // This keeps app state but asks Next.js to revalidate the data.
      router.refresh();
    };

    (async () => {
      // Resolve the native plugin from the Capacitor runtime instead of importing from npm.
      const capAny = Capacitor as unknown as { Plugins?: Record<string, any> };
      const plugin = capAny.Plugins?.CapacitorSwipeGesturesPlugin;
      if (!plugin || typeof plugin.enablePullToRefresh !== 'function') {
        return;
      }

      const logEndpoint = 'http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307';

      try {
        // #region agent log
        fetch(logEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_start`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'About to call enablePullToRefresh',
            data: {
              hasPlugins: !!capAny.Plugins,
              hasSwipePlugin: !!plugin,
              platform: Capacitor.getPlatform(),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log

        // #region agent log proxy
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_start_proxy`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'About to call enablePullToRefresh',
            data: {
              hasPlugins: !!capAny.Plugins,
              hasSwipePlugin: !!plugin,
              platform: Capacitor.getPlatform(),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log proxy

        await plugin.enablePullToRefresh();

        // #region agent log
        fetch(logEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_done`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'enablePullToRefresh completed',
            data: {},
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log

        // #region agent log proxy
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_done_proxy`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'enablePullToRefresh completed',
            data: {},
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log proxy
      } catch (err) {
        // #region agent log
        fetch(logEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_error`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'enablePullToRefresh threw',
            data: {
              error:
                err && typeof err === 'object'
                  ? { name: (err as Error).name, message: (err as Error).message, stack: (err as Error).stack }
                  : String(err),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log

        // #region agent log proxy
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `log_${Date.now()}_pull_to_refresh_error_proxy`,
            runId: 'pre-fix',
            hypothesisId: 'H-capacitor-swipe-plugin',
            location: 'app/components/Layout.tsx:enablePullToRefresh',
            message: 'enablePullToRefresh threw',
            data: {
              error:
                err && typeof err === 'object'
                  ? { name: (err as Error).name, message: (err as Error).message }
                  : String(err),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion agent log proxy

        // Preserve previous behavior: surface the error
        throw err;
      }

      if (cancelled) return;
      window.addEventListener('capacitorswipegesturesplugin:onRefresh', handler);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('capacitorswipegesturesplugin:onRefresh', handler);
    };
  }, [router]);

  const isChatThread = pathname.startsWith('/messages/') && pathname !== '/messages';
  const isListingDetail = pathname.startsWith('/listing/');
  
  const isSignupFlow = pathname.startsWith('/signup');
  const isWelcome = pathname === '/welcome';
  const shouldHideNav = hideNavPaths.includes(pathname) || isSignupFlow || isWelcome || isChatThread || isListingDetail;

  return (
    <ListingProvider>
      <div className="h-screen bg-relay-bg dark:bg-relay-bg-dark flex justify-center selection:bg-primary selection:text-white transition-colors duration-400">
        <div className="relative w-full max-w-md flex flex-col h-full shadow-2xl bg-relay-surface dark:bg-relay-surface-dark border-x border-relay-border dark:border-relay-border-dark">
          <main ref={mainRef} className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-col flex-1 min-h-0">
              {children}
            </div>
          </main>
          {/* Splash disabled
          {showSplash && (
            <div className="absolute inset-0 z-[9998] flex items-center justify-center">
              <SplashScreen onDone={() => setShowSplash(false)} />
            </div>
          )}
          */}
          {!shouldHideNav && <BottomNav />}
        </div>
      </div>
    </ListingProvider>
  );
};

export default Layout;
