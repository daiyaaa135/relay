'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { type } from '@/lib/typography';
import { getDefaultAvatar } from '@/lib/avatars';

type Conversation = {
  id: string;
  sender: string;
  gadgetName: string | null;
  gadgetImage: string | null;
  lastMessage: string;
  time: string;
  unread: boolean;
  avatar: string;
  /** When set, this conversation is tied to an active swap (Swap tab). When null, it's a general inquiry (Chat tab). */
  swapId: string | null;
}

function formatTime(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="66"
    height="61"
    viewBox="0 0 66 61"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <path
      d="M46.4838 20.5792C56.9718 20.9172 65.4398 29.5562 65.5448 40.0099C65.5788 43.8369 64.5168 47.4109 62.6508 50.4479C62.3858 50.8749 62.3358 51.3969 62.4958 51.8699L64.3268 57.3369C64.9558 59.2209 63.0798 60.9759 61.2328 60.2299L55.5798 57.9439C55.1408 57.7649 54.6468 57.7699 54.2228 57.9689C51.7028 59.1519 48.8938 59.8229 45.9298 59.8329C35.3067 59.8819 26.4499 51.3679 26.1405 40.7899C25.8062 29.4617 35.1121 20.2114 46.4888 20.5742L46.4838 20.5792Z"
      fill="url(#paint0_linear_0_1)"
    />
    <foreignObject x="-18" y="-18" width="86.9796" height="87.8376">
      <div
        style={{
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          clipPath: 'url(#bgblur_0_0_1_clip_path)',
          height: '100%',
          width: '100%',
        }}
      />
    </foreignObject>
    <path
      data-figma-bg-blur-radius="18"
      d="M24.6855 1.01311C38.8208 0.55591 50.3828 12.1173 49.9688 26.2876C49.5838 39.512 38.5758 50.1539 25.3798 50.0969C21.9253 50.0839 18.6424 49.3459 15.6679 48.0369L15.0771 47.7669C14.2514 47.3759 13.3212 47.3849 12.5185 47.7099L12.5166 47.7109L5.20213 50.6819C3.65783 51.3099 2.08103 49.9029 2.48243 48.3179L2.52833 48.1639L4.89354 41.0439L4.89553 41.0399C5.16593 40.2129 5.10784 39.2939 4.68364 38.5049L4.59373 38.3499C2.34673 34.6799 1.03653 30.3713 1.00003 25.7534V25.3051C1.12833 12.2423 11.641 1.44471 24.6582 1.01411H24.6689L24.6855 1.01311Z"
      fill="url(#paint1_linear_0_1)"
      stroke="url(#paint2_linear_0_1)"
      strokeWidth="2"
    />
    <defs>
      <clipPath id="bgblur_0_0_1_clip_path" transform="translate(18 18)">
        <path d="M24.6855 1.01311C38.8208 0.55591 50.3828 12.1173 49.9688 26.2876C49.5838 39.512 38.5758 50.1539 25.3798 50.0969C21.9253 50.0839 18.6424 49.3459 15.6679 48.0369L15.0771 47.7669C14.2514 47.3759 13.3212 47.3849 12.5185 47.7099L12.5166 47.7109L5.20213 50.6819C3.65783 51.3099 2.08103 49.9029 2.48243 48.3179L2.52833 48.1639L4.89354 41.0439L4.89553 41.0399C5.16593 40.2129 5.10784 39.2939 4.68364 38.5049L4.59373 38.3499C2.34673 34.6799 1.03653 30.3713 1.00003 25.7534V25.3051C1.12833 12.2423 11.641 1.44471 24.6582 1.01411H24.6689L24.6855 1.01311Z" />
      </clipPath>
      <linearGradient
        id="paint0_linear_0_1"
        x1="41.6838"
        y1="21.9113"
        x2="50.4908"
        y2="61.0249"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF30B" />
        <stop offset="1" stopColor="#FE4A0E" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_0_1"
        x1="2.87713"
        y1="48.9109"
        x2="48.8548"
        y2="3.6933"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="white" stopOpacity="0.2" />
        <stop offset="1" stopColor="white" stopOpacity="0.49" />
      </linearGradient>
      <linearGradient
        id="paint2_linear_0_1"
        x1="3.59763"
        y1="4.07741"
        x2="46.9708"
        y2="49.6869"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/** Return a short preview for the list; parses JSON system messages so we don't show raw payload. */
function messagePreview(content: string | null): string {
  if (content == null || content === '') return 'No messages yet';
  const t = content.trim();
  if (!t.startsWith('{')) return content;
  try {
    const p = JSON.parse(content) as { _type?: string };
    if (p._type === 'pickup_proposal') return 'Pickup times proposed';
    if (p._type === 'pickup_accepted') return 'Pickup time confirmed';
    if (p._type === 'swap_cancelled') return 'Swap cancelled';
  } catch {
    // ignore
  }
  return content;
}

type InboxTab = 'swap' | 'chat';

export default function MessagesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InboxTab>('swap');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUserId(user?.id ?? null);
        setAuthChecked(true);
        if (!user?.id) {
          setLoading(false);
          return;
        }
        const uid = user.id;
        const { data: convsData, error: convsError } = await supabase
          .from('conversations')
          .select(`
            id,
            buyer_profile_id,
            seller_profile_id,
            swap_id,
            buyer:profiles!buyer_profile_id(display_name, avatar_url),
            seller:profiles!seller_profile_id(display_name, avatar_url),
            gadget:gadgets!gadget_id(id, name, image_urls)
          `)
          .or(`buyer_profile_id.eq.${uid},seller_profile_id.eq.${uid}`)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (convsError || !convsData?.length) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const convIds = convsData.map((c: { id: string }) => c.id);
        const { data: messagesData } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_profile_id, read_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        const lastByConv: Record<string, { content: string; created_at: string; sender_profile_id: string; read_at: string | null }> = {};
        const hasUnreadByConv: Record<string, boolean> = {};
        if (messagesData) {
          for (const m of messagesData as { conversation_id: string; content: string; created_at: string; sender_profile_id: string; read_at: string | null }[]) {
            if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m;
            if (m.sender_profile_id !== uid && m.read_at == null) hasUnreadByConv[m.conversation_id] = true;
          }
        }

        const list: Conversation[] = convsData.map((conv: Record<string, unknown>) => {
          const convId = conv.id as string;
          const buyerId = conv.buyer_profile_id as string;
          const sellerId = conv.seller_profile_id as string;
          const isBuyer = buyerId === uid;
          const otherId = isBuyer ? sellerId : buyerId;
          const buyerProfile = Array.isArray(conv.buyer) ? (conv.buyer as Record<string, unknown>[])[0] : conv.buyer as Record<string, unknown>;
          const sellerProfile = Array.isArray(conv.seller) ? (conv.seller as Record<string, unknown>[])[0] : conv.seller as Record<string, unknown>;
          const otherProfile = isBuyer ? sellerProfile : buyerProfile;
          const displayName = (otherProfile?.display_name as string) ?? 'Unknown';
          const avatarUrl = (otherProfile?.avatar_url as string) || getDefaultAvatar(otherId);
          const gadgetRaw = Array.isArray(conv.gadget) ? (conv.gadget as Record<string, unknown>[])[0] : conv.gadget as Record<string, unknown> | null;
          const gadgetName = (gadgetRaw?.name as string) ?? null;
          const gadgetImages = gadgetRaw?.image_urls as string[] | null;
          const gadgetImage = gadgetImages?.[0] ?? null;
          const last = lastByConv[convId];
          const rawContent = last?.content ?? null;
          const lastMessage = messagePreview(rawContent);
          const time = last?.created_at ? formatTime(last.created_at) : '—';
          const unread = !!hasUnreadByConv[convId];
          return {
            id: convId,
            sender: displayName,
            gadgetName,
            gadgetImage,
            lastMessage,
            time,
            unread,
            avatar: avatarUrl,
            swapId: (conv.swap_id as string) ?? null,
          };
        });
        setConversations(list);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Memoized filter ───────────────────────────────────────
  // Avoids re-filtering on every render; only recomputes when
  // conversations, active tab, or search query actually change.
  const swapConversations = useMemo(
    () => conversations.filter((c) => c.swapId != null),
    [conversations]
  );
  const chatConversations = useMemo(
    () => conversations.filter((c) => c.swapId == null),
    [conversations]
  );
  const filteredConversations = useMemo(() => {
    const list = activeTab === 'swap' ? swapConversations : chatConversations;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const sender = c.sender?.toLowerCase() ?? '';
      const gadget = c.gadgetName?.toLowerCase() ?? '';
      const preview = c.lastMessage?.toLowerCase() ?? '';
      return sender.includes(q) || gadget.includes(q) || preview.includes(q);
    });
  }, [activeTab, searchQuery, swapConversations, chatConversations]);
  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 z-30 px-6 pb-3 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md pt-safe-2_25"
      >
        <div className="mb-3">
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Inbox</h1>
        </div>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-relay-muted dark:text-white/50 transition-colors text-xl group-focus-within:text-primary">
            search
          </span>
          <input
            className="search-bar-input w-full h-10 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl pl-12 pr-4 text-relay-text dark:text-relay-text-dark placeholder-relay-muted dark:placeholder-white/50 text-sm focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <nav
          className="flex w-full mt-4"
          role="tablist"
          aria-label="Inbox tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'swap'}
            aria-controls="inbox-swap-panel"
            id="inbox-tab-swap"
            onClick={() => setActiveTab('swap')}
            className={`relative flex-1 flex justify-center items-center pb-2.5 text-sm font-semibold tracking-normal transition-colors ${
              activeTab === 'swap'
                ? 'text-relay-text dark:text-relay-text-dark'
                : 'text-relay-muted dark:text-relay-muted-light hover:text-relay-text dark:hover:text-relay-text-dark'
            }`}
          >
            Swap
            {activeTab === 'swap' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" aria-hidden />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chat'}
            aria-controls="inbox-chat-panel"
            id="inbox-tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`relative flex-1 flex justify-center items-center pb-2.5 text-sm font-semibold tracking-normal transition-colors ${
              activeTab === 'chat'
                ? 'text-relay-text dark:text-relay-text-dark'
                : 'text-relay-muted dark:text-relay-muted-light hover:text-relay-text dark:hover:text-relay-text-dark'
            }`}
          >
            Chat
            {activeTab === 'chat' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" aria-hidden />
            )}
          </button>
        </nav>
      </header>

      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-2 pt-3 pb-20">
        {!authChecked || loading ? (
          <div className="flex justify-center py-20">
            <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !userId ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <InboxIcon className="w-24 h-24 mb-8" />
            <h2 className="text-relay-text dark:text-relay-text-dark font-serif text-lg font-semibold mb-2">Log in to see your messages</h2>
            <p className="text-relay-muted dark:text-relay-muted-light text-[11px] font-normal max-w-[240px] leading-relaxed mb-6">
              Conversations appear here once you start a swap.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-primary text-xs font-semibold tracking-tight hover:text-primary/80 transition-colors"
            >
              Log In
            </button>
          </div>
        ) : (() => {
          const filteredList = filteredConversations;
          const isEmpty = filteredList.length === 0;
          return isEmpty ? (
            <div
              id={activeTab === 'swap' ? 'inbox-swap-panel' : 'inbox-chat-panel'}
              role="tabpanel"
              aria-labelledby={activeTab === 'swap' ? 'inbox-tab-swap' : 'inbox-tab-chat'}
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              {activeTab === 'swap' ? (
                <span className="material-symbols-outlined text-relay-muted !text-5xl mb-4">
                  swap_horiz
                </span>
              ) : (
                <InboxIcon className="w-16 h-16 mb-4" />
              )}
              <p className="text-relay-muted dark:text-relay-muted-light text-sm font-medium">
                {activeTab === 'swap' ? 'No swap threads yet' : 'No chat threads yet'}
              </p>
              <p className="text-relay-muted dark:text-relay-muted-light text-xs">
                {activeTab === 'swap'
                  ? 'When you start a swap with credits, the thread will appear here.'
                  : 'General inquiries from the Message button on listings appear here.'}
              </p>
            </div>
          ) : (
            <div
              id={activeTab === 'swap' ? 'inbox-swap-panel' : 'inbox-chat-panel'}
              role="tabpanel"
              aria-labelledby={activeTab === 'swap' ? 'inbox-tab-swap' : 'inbox-tab-chat'}
            >
              {filteredList.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => router.push(`/messages/${msg.id}`)}
                  className={`group relative flex items-center gap-4 p-5 mx-2 rounded-3xl transition-all cursor-pointer ${msg.unread ? 'bg-primary/5 shadow-lg shadow-primary/5' : 'hover:bg-relay-bg dark:hover:bg-relay-bg-dark opacity-80 dark:opacity-100 hover:opacity-100'}`}
                >
                  <div className="relative">
                    <div className="size-16 rounded-full overflow-hidden border-2 border-relay-border dark:border-relay-border-dark p-0.5">
                      <img src={msg.avatar} alt={msg.sender} className="w-full h-full object-cover rounded-full" loading="lazy" />
                    </div>
                    {msg.unread && (
                      <div className="absolute top-0 right-0 size-4 bg-primary rounded-full border-4 border-relay-surface dark:border-relay-surface-dark shadow-lg shadow-primary/20"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-sm font-serif  ${msg.unread ? 'text-relay-text dark:text-relay-text-dark font-bold' : 'text-relay-muted dark:text-relay-muted-light'}`}>{msg.sender}</h3>
                      <span className="text-[9px] text-relay-muted dark:text-relay-muted-light font-medium tracking-normal">{msg.time}</span>
                    </div>
                    {msg.gadgetName && (
                      <p className="text-[10px] font-semibold text-relay-text dark:text-relay-text-dark truncate mb-0.5">{msg.gadgetName}</p>
                    )}
                    <p className={`text-xs truncate ${msg.unread ? 'text-relay-text dark:text-relay-text-dark font-medium' : 'text-relay-muted dark:text-relay-muted-light font-light'}`}>
                      {msg.lastMessage}
                    </p>
                  </div>
                  <div className="text-relay-border dark:text-relay-border-dark group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined !text-sm">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      </div>
    </div>
  );
}
