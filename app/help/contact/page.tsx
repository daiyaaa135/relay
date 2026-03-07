'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchGadgetsByProfileId } from '@/lib/gadgets';
import { fetchMySwaps, type SwapRow } from '@/lib/swaps';

type TopicId = 'Swap' | 'Listing' | 'Account' | 'Membership' | 'Credits';

type IssueId =
  | 'swap-partner-not-responding'
  | 'swap-no-show'
  | 'swap-item-not-same'
  | 'swap-condition-worse'
  | 'swap-cancel-option-missing'
  | 'swap-stuck-pending'
  | 'swap-suspected-scam'
  | 'listing-removed-unknown'
  | 'listing-photos-stolen'
  | 'listing-cant-edit'
  | 'listing-wrong-condition'
  | 'account-suspended'
  | 'account-profile-not-updating'
  | 'credits-debited-no-swap'
  | 'credits-double-debit'
  | 'credits-no-refund-after-cancel'
  | 'membership-unwanted-charge'
  | 'membership-charged-after-cancel'
  | 'membership-cant-cancel'
  | 'membership-missed-promo'
  | 'membership-wrong-price';

type IssueConfig = {
  id: IssueId;
  title: string;
  bullets: string[];
};

type TopicConfig = {
  topic: TopicId;
  issues: IssueConfig[];
};

type GadgetSummary = { id: string; name: string; image?: string };
type SwapSummary = { id: string; label: string };

const TOPIC_CONFIGS: TopicConfig[] = [
  {
    topic: 'Swap',
    issues: [
      {
        id: 'swap-partner-not-responding',
        title: "My swap partner isn't responding to my messages.",
        bullets: [
          'Give them some time — many users cannot reply immediately.',
          'Check that your messages are sending (no error banner and they appear in the conversation).',
          'If there is no reply after 24–48 hours, cancel from the swap details screen or contact support.',
          "If their behavior feels suspicious, use the Report option in the conversation or on their profile so our team can review.",
        ],
      },
      {
        id: 'swap-no-show',
        title: "The other person isn't showing up to our meetup.",
        bullets: [
          'Wait at least 15 minutes at the agreed location in case they are running late.',
          'Message them in‑app to ask if they are still coming or want to reschedule.',
          'If there is no response, mark the meetup as a no‑show in swap details (if available) or cancel the swap.',
          'Leave a rating and, if needed, report the user so our team can review their account for repeated no‑shows.',
        ],
      },
      {
        id: 'swap-item-not-same',
        title: "The item I received isn't the same as what was listed.",
        bullets: [
          'Take clear photos or a short video showing what you actually received, including any packaging.',
          'Open swap details and use any available Report or Support option to submit your evidence.',
          'Do not mark the swap as completed while the issue is under review.',
          'Our team will review the listing, chat, and your photos and may reverse the swap, adjust credits, or act on the other user’s account.',
        ],
      },
      {
        id: 'swap-condition-worse',
        title: 'The condition of the item I received is worse than described.',
        bullets: [
          'Document the condition with photos (scratches, cracks, defects, worn edges) as soon as you notice it.',
          'From swap details, file a condition dispute or contact support with your photos attached.',
          'Keep all communication inside the app so we can see what was promised and how the meetup went.',
          'We will compare the listing, conversation, and evidence to decide on a fair resolution.',
        ],
      },
      {
        id: 'swap-cancel-option-missing',
        title: "I want to cancel a swap but don't see the option.",
        bullets: [
          'Open swap details and check the status — cancellation is usually only available before the swap is completed or fully confirmed.',
          'If there is no cancel button and the swap is still pending, use the contact or support option from the same screen.',
          'Include why you are cancelling (no response, changed plans, item issue) to help us keep the marketplace safe.',
        ],
      },
      {
        id: 'swap-stuck-pending',
        title: 'My swap shows as "pending" for a long time and never completes.',
        bullets: [
          'Confirm both sides have done everything required (picked a time, confirmed meetup, marked arrival if applicable).',
          'Refresh the app or sign out and back in to rule out a display issue.',
          'If the status still looks stuck, contact support from the swap details screen so we can manually correct it.',
          'Avoid starting a duplicate swap for the same items while the original is still pending.',
        ],
      },
      {
        id: 'swap-suspected-scam',
        title: "I'm worried the other user is a scammer and want to report them.",
        bullets: [
          'From their profile or your conversation, tap Report and choose the closest reason.',
          'Describe what is happening (fake photos, off‑platform payment requests, harassment) and attach screenshots if you can.',
          'Block the user so they cannot message you again.',
          'Our team will investigate and may warn, restrict, or remove their account if abuse is confirmed.',
        ],
      },
    ],
  },
  {
    topic: 'Listing',
    issues: [
      {
        id: 'listing-removed-unknown',
        title: "My listing was removed and I don't know why.",
        bullets: [
          'Check your notifications or email — we usually send a message explaining why a listing was removed.',
          'Review our listing guidelines for prohibited items, photo rules, pricing, and safety expectations.',
          'Fix any issues (e.g., update photos, adjust description) and create a new listing that follows the rules.',
          'If the reason is still unclear, contact support with the listing title and ID so we can explain.',
        ],
      },
      {
        id: 'listing-photos-stolen',
        title: 'Someone else is using my photos in their listing.',
        bullets: [
          'Open their listing and tap any available Report Listing option.',
          'Select the reason closest to stolen or copyrighted photos and, if possible, link or attach your original listing.',
          'We will review and may remove their listing or take action on their account.',
          'You can also contact support directly with proof that you took the original photos (same device, uncropped versions, or timestamps).',
        ],
      },
      {
        id: 'listing-cant-edit',
        title: "I can't edit my listing's price or description.",
        bullets: [
          'Confirm the listing is still active and not already swapped, cancelled, or expired.',
          'If it is active, close and reopen the app, then try editing from the listing details screen again.',
          'Some details lock after you receive a swap request — in that case, you may need to end the listing and create a new one.',
          'If there is no edit option at all, screenshot what you see and contact support so we can investigate.',
        ],
      },
      {
        id: 'listing-wrong-condition',
        title: 'My listing shows the wrong condition or category.',
        bullets: [
          'If editing is allowed, go to listing details and update the condition or category directly.',
          'If editing is blocked, end the listing and create a new one with the correct details.',
          'Make sure your photos and description clearly match the chosen condition so buyers know what to expect.',
          'If the condition changed on its own without your input, contact support with the listing ID so we can check for a bug.',
        ],
      },
    ],
  },
  {
    topic: 'Account',
    issues: [
      {
        id: 'account-suspended',
        title: 'My account was suspended or restricted without a clear reason.',
        bullets: [
          'Check your email (including spam) for a message explaining why your account was limited.',
          'Review our community and safety guidelines to see what may have triggered the suspension.',
          'If you believe it was a mistake, reply to the suspension email or contact support with your username and a short explanation.',
          'While your account is restricted, some actions like listing, messaging, or starting swaps may be limited until the review is complete.',
        ],
      },
      {
        id: 'account-profile-not-updating',
        title: "My profile information or photo won't update.",
        bullets: [
          'Make sure you have a stable internet connection and try again.',
          'Check that your photo meets basic requirements (JPEG/PNG, reasonable file size, no animated formats).',
          'Try logging out and back in, or updating your profile from a different device.',
          'If changes still do not save, screenshot the error or what you see and contact support so we can check for a technical issue.',
        ],
      },
    ],
  },
  {
    topic: 'Credits',
    issues: [
      {
        id: 'credits-debited-no-swap',
        title: "I was debited but the swap didn't go through.",
        bullets: [
          'Check your swaps or orders page to see whether anything completed or is still pending.',
          'If nothing shows but your credits went down, wait a few minutes and refresh — failed swaps often auto‑revert.',
          'If your balance still looks wrong, contact support with the swap ID (if any) and the time of the attempted transaction.',
        ],
      },
      {
        id: 'credits-double-debit',
        title: 'I was debited twice for the same transaction.',
        bullets: [
          'Look at your history to confirm how many swaps or purchases actually succeeded.',
          'If only one went through but your balance shows two debits, screenshot your credits history and any related swap IDs.',
          'Contact support so we can verify the duplicate charge and restore any extra credits.',
        ],
      },
      {
        id: 'credits-no-refund-after-cancel',
        title: "I cancelled the swap but haven't received a credit refund.",
        bullets: [
          'Confirm the swap shows as Cancelled in the swap details screen.',
          'Most cancellations return credits automatically—wait a few minutes then check your balance again.',
          'If the balance has not updated, share the swap ID with support so we can manually restore your credits.',
        ],
      },
    ],
  },
  {
    topic: 'Membership',
    issues: [
      {
        id: 'membership-unwanted-charge',
        title: "I was charged for membership but didn't mean to subscribe.",
        bullets: [
          'Review your membership page to see your current plan and renewal date.',
          'Turn off auto‑renew so you are not charged again in the future.',
          'Contact support with the date and amount of the charge — depending on our refund policy and your usage, we may be able to reverse it.',
        ],
      },
      {
        id: 'membership-charged-after-cancel',
        title: 'I cancelled my membership but was still billed.',
        bullets: [
          'Confirm your membership status now shows as Cancelled or Ends on [date].',
          'If you cancelled close to the renewal date, the charge may already have processed — find any cancellation confirmation you received.',
          'Contact support with your account email, cancellation date, and billing transaction so we can investigate.',
        ],
      },
      {
        id: 'membership-cant-cancel',
        title: "I can't figure out how to cancel or pause my membership.",
        bullets: [
          'Go to Settings → Membership in the app and look for Manage, Cancel, or Pause.',
          'If you subscribed through the App Store or Play Store, you may need to cancel from your device’s subscription settings instead.',
          'If you still cannot find the option, contact support and tell us which platform you used so we can send step‑by‑step instructions.',
        ],
      },
      {
        id: 'membership-missed-promo',
        title: "I didn't receive a promotion or discount that was advertised.",
        bullets: [
          'Confirm the promotion was still active when you signed up and that you met all eligibility rules.',
          'Gather a screenshot of the promotion and your membership or transaction details.',
          'Contact support — if you qualify, we will apply the missing credits or discount manually.',
        ],
      },
      {
        id: 'membership-wrong-price',
        title: 'I was charged the wrong membership price.',
        bullets: [
          'Check what price is shown on your membership plan or in the app store today.',
          'Compare it to the amount that appears on your bank or card statement.',
          'Contact support with screenshots of both the advertised price and the charge so we can review and, where appropriate, refund the difference.',
        ],
      },
    ],
  },
];

function getTopicConfig(topic: TopicId | null): TopicConfig | null {
  if (!topic) return null;
  return TOPIC_CONFIGS.find((t) => t.topic === topic) ?? null;
}

export default function ContactHelpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<IssueId | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [swapItems, setSwapItems] = useState<SwapSummary[]>([]);
  const [listingItems, setListingItems] = useState<GadgetSummary[]>([]);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user?.id) return;
        setProfileId(user.id);
        setLoadingItems(true);
        const [swaps, gadgets] = await Promise.all([
          fetchMySwaps(user.id),
          fetchGadgetsByProfileId(user.id, 'active'),
        ]);
        if (cancelled) return;
        const swapSummaries: SwapSummary[] = (swaps ?? []).slice(0, 10).map((swap) => {
          const raw = swap.gadget;
          const gadget = Array.isArray(raw) ? raw[0] : raw;
          const name = gadget?.name ?? 'Swap item';
          return {
            id: swap.id,
            label: `${name} • ${new Date(swap.created_at).toLocaleDateString()}`,
          };
        });
        const gadgetSummaries: GadgetSummary[] = (gadgets ?? []).slice(0, 10).map((g) => ({
          id: g.id,
          name: g.name,
          image: g.image,
        }));
        setSwapItems(swapSummaries);
        setListingItems(gadgetSummaries);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTopicConfig = useMemo(() => getTopicConfig(selectedTopic), [selectedTopic]);
  const activeIssue: IssueConfig | null = useMemo(() => {
    if (!activeTopicConfig || !selectedIssueId) return null;
    return activeTopicConfig.issues.find((i) => i.id === selectedIssueId) ?? null;
  }, [activeTopicConfig, selectedIssueId]);

  const handleSelectTopic = (topic: TopicId) => {
    setSelectedTopic(topic);
    setSelectedIssueId(null);
    setCurrentStep(2);
  };

  const handleSelectIssue = (issueId: IssueId) => {
    setSelectedIssueId(issueId);
    setCurrentStep(3);
  };

  const stepStatus = (step: 1 | 2 | 3): 'active' | 'completed' | 'future' => {
    if (currentStep === step) return 'active';
    if (currentStep > step) return 'completed';
    return 'future';
  };

  const renderDot = (step: 1 | 2 | 3) => {
    const status = stepStatus(step);
    const base = 'rounded-full transition-colors';
    if (status === 'active') {
      return <div className={`${base} w-3.5 h-3.5 bg-primary`} />;
    }
    if (status === 'completed') {
      return <div className={`${base} w-2.5 h-2.5 bg-primary/70`} />;
    }
    return <div className={`${base} w-2.5 h-2.5 bg-relay-border dark:bg-relay-border-dark`} />;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <div className="page-scroll">
      <header
        className="sticky top-0 px-6 pb-4 border-b border-relay-border dark:border-relay-border-dark flex items-center justify-between bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30"
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => router.push('/help')}
          className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
          aria-label="Close contact form"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex-1 flex flex-col items-center -ml-10">
          <h1 className="text-xs font-semibold tracking-tight text-primary uppercase">
            Contact Us | Rellaey Help
          </h1>
        </div>
        <div className="w-10" aria-hidden />
      </header>

      <main className="px-6 pt-6 pb-20">
        <div className="flex">
          {/* Vertical stepper */}
          <div className="relative flex flex-col items-center mr-4">
            <div className="absolute top-0 bottom-0 w-px bg-relay-border dark:bg-relay-border-dark" aria-hidden />
            <div className="relative flex flex-col justify-between h-[260px] pt-1 pb-1">
              <div className="relative">{renderDot(1)}</div>
              <div className="relative">{renderDot(2)}</div>
              <div className="relative">{renderDot(3)}</div>
            </div>
          </div>

          {/* Steps content */}
          <div className="flex-1 space-y-10 pb-10">
            {/* Step 1 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">
                  This is about my…
                </h2>
                {selectedTopic && currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] font-semibold text-primary"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!selectedTopic || currentStep === 1 ? (
                <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark overflow-hidden">
                  {(['Swap', 'Listing', 'Account', 'Membership', 'Credits'] as TopicId[]).map(
                    (topic, index, arr) => (
                      <div
                        key={topic}
                        className={`flex items-center justify-between px-4 py-4 ${
                          index < arr.length - 1
                            ? 'border-b border-relay-border dark:border-relay-border-dark'
                            : ''
                        }`}
                      >
                        <span className="text-sm text-relay-text dark:text-relay-text-dark">
                          {topic}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectTopic(topic)}
                          className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-relay-text dark:text-relay-text-dark"
                        >
                          Select
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-relay-text dark:text-relay-text-dark">
                    {selectedTopic}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-relay-text dark:text-relay-text-dark"
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>

            {/* Step 2 */}
            <section
              aria-disabled={!selectedTopic}
              className={!selectedTopic ? 'opacity-60 pointer-events-none' : ''}
            >
              <div className="flex items-center justify-between mb-3">
                <h2
                  className={`text-base font-semibold ${
                    currentStep >= 2
                      ? 'text-relay-text dark:text-relay-text-dark'
                      : 'text-relay-muted'
                  }`}
                >
                  What part of the issue are you having trouble with?
                </h2>
                {selectedTopic && selectedIssueId && currentStep > 2 && activeIssue && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] font-semibold text-primary"
                  >
                    Edit
                  </button>
                )}
              </div>

              {selectedTopic && (!selectedIssueId || currentStep === 2) && (
                <div className="space-y-6">
                  {(selectedTopic === 'Listing' || selectedTopic === 'Swap') && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
                        What item are you asking about?
                      </p>
                      <p className="text-[11px] text-relay-muted">
                        Choose the listing or swap that this question is about.
                      </p>
                      <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark max-h-40 overflow-y-auto">
                        {loadingItems ? (
                          <div className="px-4 py-6 text-xs text-relay-muted">Loading items…</div>
                        ) : selectedTopic === 'Listing' ? (
                          listingItems.length === 0 ? (
                            <div className="px-4 py-6 text-xs text-relay-muted">
                              You have no eligible items.
                            </div>
                          ) : (
                            listingItems.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setSelectedListingId(g.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs ${
                                  selectedListingId === g.id
                                    ? 'bg-primary/5 text-primary'
                                    : 'text-relay-text dark:text-relay-text-dark'
                                }`}
                              >
                                <span className="truncate">{g.name}</span>
                                {selectedListingId === g.id && (
                                  <span className="material-symbols-outlined text-[16px] ml-2">
                                    check
                                  </span>
                                )}
                              </button>
                            ))
                          )
                        ) : swapItems.length === 0 ? (
                          <div className="px-4 py-6 text-xs text-relay-muted">
                            You have no eligible items.
                          </div>
                        ) : (
                          swapItems.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSwapId(s.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs ${
                                selectedSwapId === s.id
                                  ? 'bg-primary/5 text-primary'
                                  : 'text-relay-text dark:text-relay-text-dark'
                              }`}
                            >
                              <span className="truncate">{s.label}</span>
                              {selectedSwapId === s.id && (
                                <span className="material-symbols-outlined text-[16px] ml-2">
                                  check
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-relay-text dark:text-relay-text-dark">
                      Tell us more about the issue
                    </p>
                    <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark overflow-hidden">
                      {activeTopicConfig?.issues.map((issue, index, arr) => (
                        <div
                          key={issue.id}
                          className={`flex items-center justify-between px-4 py-3 ${
                            index < arr.length - 1
                              ? 'border-b border-relay-border dark:border-relay-border-dark'
                              : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-relay-text dark:text-relay-text-dark">
                              {index + 1}. {issue.title}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectIssue(issue.id)}
                            className="ml-3 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-relay-text dark:text-relay-text-dark"
                          >
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedTopic && selectedIssueId && currentStep > 2 && activeIssue && (
                <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-relay-text dark:text-relay-text-dark truncate">
                      {activeIssue.title}
                    </p>
                    {selectedTopic === 'Listing' && selectedListingId && (
                      <p className="text-[10px] text-relay-muted mt-0.5 truncate">
                        Listing ID: {selectedListingId}
                      </p>
                    )}
                    {selectedTopic === 'Swap' && selectedSwapId && (
                      <p className="text-[10px] text-relay-muted mt-0.5 truncate">
                        Swap ID: {selectedSwapId}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="ml-3 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-relay-text dark:text-relay-text-dark"
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>

            {/* Step 3 */}
            <section>
              <h2
                className={`mb-3 text-base font-semibold ${
                  currentStep === 3
                    ? 'text-relay-text dark:text-relay-text-dark'
                    : 'text-relay-muted'
                }`}
              >
                Solution
              </h2>
              {currentStep < 3 || !activeIssue ? (
                <p className="text-xs text-relay-muted">
                  Select an issue above to see tailored steps you can take next.
                </p>
              ) : (
                <div className="rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark px-4 py-4 space-y-2">
                  <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark mb-1">
                    Recommended steps
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-relay-text dark:text-relay-text-dark">
                    {activeIssue.bullets.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

