'use client';

import React, { useState, useEffect } from 'react';
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

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header
        className="shrink-0 z-30 px-6 pb-3 border-b border-relay-border dark:border-relay-border-dark bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md"
        style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
      >
        <div className="mb-3">
          <h1 className={`${type.h1} !font-semibold text-relay-text dark:text-relay-text-dark`}>Inbox</h1>
        </div>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-relay-muted transition-colors text-xl group-focus-within:text-primary">
            search
          </span>
          <input
            className="w-full h-14 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl pl-12 pr-4 text-relay-text dark:text-relay-text-dark placeholder-relay-muted text-sm focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
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
            <img src="/inbox-envelope-icon.png" alt="" className="w-24 h-24 object-contain mb-8" aria-hidden />
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
          const swapConvs = conversations.filter((c) => c.swapId != null);
          const chatConvs = conversations.filter((c) => c.swapId == null);
          const list = activeTab === 'swap' ? swapConvs : chatConvs;
          const q = searchQuery.trim().toLowerCase();
          const filteredList = q
            ? list.filter((c) => {
                const sender = c.sender?.toLowerCase() ?? '';
                const gadget = c.gadgetName?.toLowerCase() ?? '';
                const preview = c.lastMessage?.toLowerCase() ?? '';
                return sender.includes(q) || gadget.includes(q) || preview.includes(q);
              })
            : list;
          const isEmpty = filteredList.length === 0;
          return isEmpty ? (
            <div
              id={activeTab === 'swap' ? 'inbox-swap-panel' : 'inbox-chat-panel'}
              role="tabpanel"
              aria-labelledby={activeTab === 'swap' ? 'inbox-tab-swap' : 'inbox-tab-chat'}
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              <span className="material-symbols-outlined text-relay-muted !text-5xl mb-4">
                {activeTab === 'swap' ? 'swap_horiz' : 'chat_bubble_outline'}
              </span>
              <p className="text-relay-muted text-sm font-medium">
                {activeTab === 'swap' ? 'No swap threads yet' : 'No chat threads yet'}
              </p>
              <p className="text-relay-muted text-xs">
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
                  className={`group relative flex items-center gap-4 p-5 mx-2 rounded-3xl transition-all cursor-pointer ${msg.unread ? 'bg-primary/5 shadow-lg shadow-primary/5' : 'hover:bg-relay-bg dark:hover:bg-relay-bg-dark opacity-80 hover:opacity-100'}`}
                >
                  <div className="relative">
                    <div className="size-16 rounded-full overflow-hidden border-2 border-relay-border dark:border-relay-border-dark p-0.5">
                      <img src={msg.avatar} alt={msg.sender} className="w-full h-full object-cover rounded-full" />
                    </div>
                    {msg.unread && (
                      <div className="absolute top-0 right-0 size-4 bg-primary rounded-full border-4 border-relay-surface dark:border-relay-surface-dark shadow-lg shadow-primary/20"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-sm font-serif  ${msg.unread ? 'text-relay-text dark:text-relay-text-dark font-bold' : 'text-relay-muted'}`}>{msg.sender}</h3>
                      <span className="text-[9px] text-relay-muted font-medium tracking-normal">{msg.time}</span>
                    </div>
                    {msg.gadgetName && (
                      <p className="text-[10px] font-semibold text-relay-text dark:text-relay-text-dark truncate mb-0.5">{msg.gadgetName}</p>
                    )}
                    <p className={`text-xs truncate ${msg.unread ? 'text-relay-text dark:text-relay-text-dark font-medium' : 'text-relay-muted font-light'}`}>
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
