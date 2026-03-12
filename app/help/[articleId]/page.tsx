'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

type ArticleId =
  | 'credits'
  | 'swaps'
  | 'cancellations'
  | 'account-profile-notifications'
  | 'account-delete-pause'
  | 'legal-terms-of-service'
  | 'legal-privacy-policy'
  | 'listing-how-to-list'
  | 'listing-condition-guide'
  | 'listing-edit-remove'
  | 'swap-starting-with-credits'
  | 'swap-pickup-times-locations'
  | 'swap-rating-partner'
  | 'membership-rellaey-plus'
  | 'membership-verified-tech'
  | 'safety-meetup-checklist'
  | 'safety-blocking-reporting'
  | 'returns-swap-reversed'
  | 'returns-item-condition-disputes';

type Article = {
  id: ArticleId;
  title: string;
  category: string;
  body: string[];
};

const ARTICLES: Record<ArticleId, Article> = {
  credits: {
    id: 'credits',
    title: 'How Rellaey Credits Work',
    category: 'Credits',
    body: [
      'Rellaey credits are the currency you use to swap for gadgets on the marketplace. Instead of paying cash for each item, you move credits in and out of your balance as you list items and complete swaps.',
      'You earn credits primarily by listing your own devices and successfully completing swaps. When another member uses credits to pick up your item, those credits are transferred to your balance once the swap is finalized. In some cases, Rellaey may also grant promotional credits for limited‑time campaigns or issue courtesy credits after a support review.',
      'When you start a swap as a buyer, the required credits are held from your balance up front. Think of this as a temporary lock: the credits are set aside so the seller can trust that value is there while you agree on a time and place to meet.',
      'If the swap is completed, those held credits are permanently transferred to the seller. If the swap is cancelled according to our cancellation rules, the held credits are released back to your balance. We do not convert credits back to cash, and they can only be used inside Rellaey for future swaps.',
      'Your current balance is always visible in your profile and on listing pages where you start a swap. If something looks off, compare your recent swaps and listings to see where credits were added, held, or returned, then reach out to support with the relevant listing or swap ID.',
    ],
  },
  swaps: {
    id: 'swaps',
    title: 'How Swaps Work (Start to Finish)',
    category: 'Swap',
    body: [
      'A Rellaey swap is the full journey from seeing a listing you like to meeting up and exchanging the item for credits. Each swap is tied to a specific listing and a private message thread between you and the other member.',
      'When you tap “Swap with Credits” on a listing, we first check that you are signed in, have enough credits, and are allowed to swap with that member. If everything looks good, we create a swap, place the required credits on hold from your balance, and open a conversation where you can coordinate the pickup.',
      'Next, you propose pickup time windows using the calendar and, when offered, choose a meetup location the seller has shared. The seller can accept one of your time options, adjust the plan, or ask follow‑up questions directly in the same conversation. System messages in the thread will clearly say when a pickup time has been proposed or confirmed.',
      'On the day of the meetup, both of you use the confirmed time and location shown in the swap and messages view. After the hand‑off, the seller marks the swap as completed, which finalizes the transfer of credits into their balance. In many cases, both sides will also be prompted to leave a rating to help keep the community trustworthy.',
      'If plans change before the item is picked up, the swap can be cancelled under certain conditions. When a swap is properly cancelled, the held credits return to the buyer’s balance, and the listing may become available again for someone else. If you are ever unsure what to do next, open the swap thread from “My Swaps” and follow the guidance shown there.',
    ],
  },
  cancellations: {
    id: 'cancellations',
    title: 'How Cancellations, Refunds, and Your Credits Work',
    category: 'Credits',
    body: [
      'Sometimes a swap does not go as planned — schedules change, meetups fall through, or one person decides not to move forward. Rellaey is designed so that when this happens, your credits are handled in a predictable way.',
      'Before a swap is completed, the buyer’s credits are held, not spent. If the swap is cancelled while it is still pending, those held credits are released back to the buyer’s balance. The seller does not keep any credits from a cancelled swap, and the listing may return to the marketplace depending on its status.',
      'In rare cases, a swap may need to be reversed after it was marked completed — for example, if there is a serious issue with the item or clear proof that the description was misleading. These situations are handled by our support team on a case‑by‑case basis. When we decide to reverse or adjust a swap, we will move credits between accounts accordingly and let both sides know what happened.',
      'Listing cancellations work a little differently. When you cancel your own active listing, we may require that your account has enough available credits to unwind any outstanding obligations tied to that listing. If you see a message that you need more credits to cancel, it means there is an open or recent swap connected to that device that needs to be settled first.',
      'If you believe your credits were not returned after a cancellation, or you are unsure why a cancellation is blocked, contact us with the listing or swap ID. Our team can review the timeline, explain what happened, and correct any mistakes.',
    ],
  },
  'account-profile-notifications': {
    id: 'account-profile-notifications',
    title: 'Managing your profile and notifications',
    category: 'Account',
    body: [
      'Your profile is how other members see you on Rellaey. It includes your display name, avatar, brief bio, and the ratings you have received from past swaps.',
      'You can update your profile details from the Profile screen. Changes to your display name or avatar are applied everywhere, including on existing listings and in conversations, so other members always see your latest information.',
      'Notification settings let you choose how and when Rellaey contacts you about swaps, messages, and important account activity. We recommend keeping real‑time alerts on for new messages and upcoming meetups so you do not miss coordination from the other person.',
      'If you move to a new city or change your usual meetup area, update your profile and location preferences so distance filters and suggestions feel accurate. This helps other members understand roughly where you are based when considering a swap.',
    ],
  },
  'account-delete-pause': {
    id: 'account-delete-pause',
    title: 'Deleting or pausing your account',
    category: 'Account',
    body: [
      'If you need a break from Rellaey, you can pause your account instead of deleting it. Pausing hides your profile and listings from the marketplace while keeping your swap history and credits balance intact.',
      'Before you delete your account, make sure all active swaps are fully resolved and there are no meetups or disputes still in progress. We may block deletion if there are open obligations to other members.',
      'When an account is deleted, your profile is removed from public view and you will no longer be able to sign in with that email or social login. Some anonymized information, such as historical ratings or transaction records, may be retained for fraud prevention and auditing.',
      'If you want to return after deleting your account, you will need to create a new profile. Any unused credits at the time of deletion are forfeited and cannot be restored to a new account, so consider pausing instead if you think you might come back.',
    ],
  },
  'legal-terms-of-service': {
    id: 'legal-terms-of-service',
    title: 'RELLAEY TERMS OF SERVICE',
    category: 'Legal',
    body: [
      `Effective Date: 03/05/2026`,
      `Please read these Terms of Service ("Terms") carefully before using the Rellaey mobile application. By creating an account or using the Service, you agree to be bound by these Terms and our Privacy Policy.`,
      `1. DESCRIPTION OF THE SERVICE`,
      `Rellaey is a consumer-to-consumer marketplace that allows users to list, browse, and arrange swaps of electronics and goods. Rellaey does not buy or sell goods itself, take possession of any items, or act as a party to any swap arrangement between users. Users who list items ("Listers") and users who initiate swap requests ("Requesters") are entirely responsible for the exchange of goods between them, including item condition and any applicable warranties.`,
      `Rellaey facilitates device swap arrangements and provides platform credits ("Credits") that users earn and redeem to participate in exchanges. Rellaey does not charge transaction fees for swaps. Our revenue model is based on monthly subscription fees, device verification services, and applicable no-show fees as described below.`,
      `Rellaey is not a licensed money services business and does not process monetary transfers between users.`,
      `2. OTHER TERMS AND POLICIES WHICH APPLY`,
      `By using the Service, you agree to comply with the following policies and any additional policies that we may notify you of from time to time:`,
      `Fees & Subscription Policy`,
      `Privacy Policy`,
      `Prohibited Conduct`,
      `Prohibited Items`,
      `Electronic Communications Policy`,
      `DMCA/Copyright Notification Policy`,
      `Safety Guidelines`,
      `Law Enforcement and Information Requests`,
      `3. YOUR ACCOUNT`,
      `You must create an account to use most features of Rellaey. If Rellaey determines that your use of an account violates any of our Terms or is otherwise inappropriate or illegal, Rellaey may, at its sole discretion, take action up to and including termination of your account.`,
      `Rules for your account:`,
      `You may only register and maintain one account per user.`,
      `You may not use your account for any illegal purpose or in violation of these Terms.`,
      `You may be required to provide accurate information about yourself (such as your name, address, date of birth, and/or government-issued identification) for identity verification and fraud prevention purposes. It is prohibited to use false information or impersonate another person.`,
      `You are solely responsible for all activity on your account.`,
      `You are responsible for keeping your account password secure. If you believe your account has been compromised, please contact us at contact@rellaey.com.`,
      `You are responsible for ensuring your account accurately reflects your current contact information, including phone number, email, and mailing address.`,
      `4. TERMINATION BY YOU`,
      `You may close your account at any time through your Rellaey account settings. After terminating your account:`,
      `Some listing content and transaction history may be retained in our records as required by applicable law.`,
      `You remain responsible for any outstanding fees or obligations arising from activity prior to termination.`,
      `Rellaey-issued Credits or unused subscription periods become invalid upon account termination, except as required by applicable law.`,
      `5. SCOPE OF LICENSE`,
      `Our Service is licensed, not sold, to you. Rellaey grants you a personal, limited, revocable, non-transferable license to use the Rellaey app.`,
      `You may not:`,
      `Modify, reproduce, distribute, or make the app available over a network where it could be used by multiple devices simultaneously`,
      `Rent, lease, sell, or sublicense the app`,
      `Decompile, reverse engineer, or attempt to derive the source code of the app`,
      `Attempt to disable or circumvent any security or technological protection measures`,
      `6. THIRD-PARTY SERVICES AND LINKED SITES`,
      `Our Service may contain links to third-party websites or services that we do not own or control. When you access these third-party services, you do so at your own risk. Rellaey is not a party to any agreements between you and third parties.`,
      `7. YOUR CONTENT`,
      `Content that you post using our Service must be content you own or have the right to use, including usernames, profile photos, listing photos, item descriptions, and messages.`,
      `Responsibility: You are solely responsible for your content and represent that you have all necessary rights to post it.`,
      `License to Rellaey: By posting content, you grant Rellaey a non-exclusive, worldwide, royalty-free, irrevocable, sublicensable, perpetual license to use, display, edit, reproduce, distribute, store, and prepare derivative works of your content to provide and promote the Service.`,
      `Inappropriate Content: You agree not to post content that is illegal, abusive, threatening, defamatory, obscene, false, misleading, or otherwise in violation of our policies.`,
      `8. YOUR USE OF THE SERVICE`,
      `We grant you a limited, non-exclusive, non-transferable, and revocable license to use our Service subject to these Terms.`,
      `Don't Break the Law: You agree not to violate any applicable local, state, federal, or international laws in connection with your use of the Service.`,
      `Don't Harm Our Systems: You agree not to interfere with or disrupt the Service, including by distributing viruses, harmful code, or activity that places an excessive burden on our systems.`,
      `Electronic Communications: By using the Service, you agree to our Electronic Communications Policy, which allows us to send you information electronically in place of paper communications.`,
      `People You Interact With: You understand that Rellaey does not screen users beyond identity and device verification. You release Rellaey from all liability relating to your interactions with other users. Please follow our Safety Guidelines in all exchange arrangements.`,
      `9. FEES`,
      `Rellaey charges the following fees:`,
      `a. Monthly Subscription Fee`,
      `Access to the Rellaey platform requires an active monthly subscription. Subscription pricing is listed in the app and on our Fees page. We may change subscription fees by posting changes in the app in advance.`,
      `c. No-Show Fee`,
      `If you confirm an in-person exchange arrangement and fail to appear without canceling in advance, a $5 no-show fee will be charged to your payment method on file. By confirming a swap meetup, you acknowledge and agree to this fee. We may use your payment information on file to process this charge.`,
      `Rellaey does not charge transaction fees for swaps. No monetary payments are exchanged between users through the platform — all swap arrangements are facilitated through platform Credits.`,
      `10. PAYMENTS AND PAYMENT INSTRUMENTS`,
      `By agreeing to these Terms, you authorize Rellaey and/or its payment processor to charge your designated payment instrument for applicable subscription fees, device verification fees, and no-show fees.`,
      `Payment instruments (credit card, debit card, or other permitted methods) may be stored securely for future use.`,
      `Rellaey does not accept cash or check as a payment method.`,
      `You agree that the payment information you provide is accurate and that you will keep it updated.`,
      `All fees will be disclosed before charges are made, except for no-show fees which are disclosed at the time of swap confirmation.`,
      `11. PLATFORM CREDITS`,
      `Users may earn Rellaey Credits by completing verified swaps, participating in promotions, or as otherwise provided by Rellaey. Credits can be used to initiate swap requests for eligible items on the platform.`,
      `Credits are an in‑app value system used to facilitate swaps. Credits may be held during an active swap, transferred when a swap completes, and returned when a swap is cancelled according to our rules. Credits are not cash and are not redeemable outside of Rellaey.`,
      `Credits are redeemed at a rate of 1 Credit = 1 unit of swap value, unless otherwise specified by Rellaey.`,
      `Credits cannot be exchanged for cash or transferred to other users.`,
      `Credits expire 90 days after issuance unless otherwise stated at the time of issuance.`,
      `If Rellaey determines that your earning or use of Credits violates these Terms, Rellaey may invalidate all Credits associated with your account.`,
      `12. EXCHANGE ARRANGEMENTS AND DISPUTES BETWEEN USERS`,
      `Users are responsible for arranging, conducting, and completing their own swap exchanges. Rellaey facilitates connections between users but is not a party to any exchange arrangement.`,
      `Meetups and exchanges happen between members. Always choose safe, public locations, and inspect items before completing a swap. If you feel unsafe, leave and contact support from a safe place.`,
      `Users agree to resolve any disputes directly with the other party.`,
      `Rellaey may, at its discretion, assist in mediating disputes and reserves the right to take action on accounts involved in repeated disputes or policy violations.`,
      `If you have a dispute with one or more users, you release Rellaey and its officers, directors, employees, and agents from all claims, demands, and damages of every kind arising out of or connected with such disputes.`,
      `13. LIMITATION, SUSPENSION, OR TERMINATION BY RELLAEY`,
      `Rellaey reserves the right to change, suspend, limit, or discontinue any of its Services at any time for any reason, without notice unless otherwise required by law. We may refuse service to anyone and may terminate or suspend your account at any time.`,
      `If we terminate or suspend your account:`,
      `You do not have a contractual right to continue using the Service.`,
      `You remain responsible for any outstanding fees or obligations arising prior to termination.`,
      `We may hold account credits or balances for up to 90 days pending resolution of any outstanding matters.`,
      `14. TRANSACTION RECORDS AND CUSTOMER SERVICE`,
      `Records of your swap activity, Credits, and fee transactions will be reflected in your account history within the app. A receipt will also be sent to the email address on your account. You are responsible for reviewing your transaction history and promptly reporting any errors or unauthorized charges to contact@rellaey.com.`,
      `15. INDEMNIFICATION; LIMITATION OF LIABILITY`,
      `Indemnity. You agree to defend and indemnify Rellaey from and against every claim, liability, damage, loss, and expense, including reasonable attorneys' fees, arising out of or in any way connected with: (i) your access to or use of the Service; (ii) your violation of these Terms or any applicable law; (iii) your violation of any third-party right; or (iv) any dispute between you and any third party.`,
      `Disclaimer of Warranties. THE SERVICE IS PROVIDED "AS IS" AND ON AN "AS AVAILABLE" BASIS WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED. RELLAEY DISCLAIMS ALL WARRANTIES, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
      `Limitation of Liability. TO THE FULLEST EXTENT PERMITTED BY LAW, RELLAEY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. RELLAEY'S AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF: (I) THE AMOUNT YOU HAVE PAID TO RELLAEY IN THE 12 MONTHS PRIOR TO THE CLAIM; OR (II) $100.`,
      `Force Majeure. Rellaey shall have no liability for failure or delay resulting from any condition beyond its reasonable control, including governmental action, acts of nature, pandemics, power failures, or internet disturbances.`,
      `16. MISCELLANEOUS`,
      `These Terms do not create any agency, partnership, joint venture, or employment relationship between you and Rellaey.`,
      `If any part of the Terms is found to be unenforceable, that part will be limited to the minimum extent necessary so that the Terms will otherwise remain in full force and effect.`,
      `You may not assign or transfer these Terms without our prior written consent. Rellaey may assign these Terms at any time without consent.`,
      `Notice: Rellaey will contact you via text message, email, or in-app notification using the contact information on your account.`,
      `17. GOVERNING LAW AND JURISDICTION`,
      `These Terms shall be governed and construed under the laws of the State of [Insert State]. Any dispute that is not subject to arbitration shall be submitted to the exclusive jurisdiction of the state and federal courts in [Insert City/State].`,
      `18. LEGAL DISPUTES AND ARBITRATION`,
      `You and Rellaey agree that any disputes or claims arising out of or relating to these Terms or your use of the Service shall be resolved exclusively through final and binding arbitration, rather than in court, except that you may assert a claim in small claims court if it qualifies.`,
      `Arbitration will be conducted by the American Arbitration Association (AAA) under its Consumer Arbitration Rules.`,
      `The arbitrator's award shall be final and binding.`,
      `YOU AND RELLAEY AGREE THAT EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY ON AN INDIVIDUAL BASIS AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS OR REPRESENTATIVE ACTION.`,
      `Opt-Out: If you are a new user, you may opt out of this arbitration agreement by emailing contact@rellaey.com with the subject line "Arbitration Opt-Out" within 30 days of first accepting these Terms.`,
      `19. NOTICE REGARDING APPLE®`,
      `To the extent you are using our app on an iOS device, you acknowledge that these Terms are between you and Rellaey only, not with Apple. Apple has no obligation to provide maintenance or support for the Service. Apple and Apple's subsidiaries are third-party beneficiaries of these Terms and, upon your acceptance, will have the right to enforce these Terms against you as a third-party beneficiary.`,
      `20. CONTACT US`,
      `If you have any questions about these Terms, please contact us through the Help Center in the Rellaey app or at contact@rellaey.com. Please include "Terms of Service" in the subject line.`,
    ],
  },
  'legal-privacy-policy': {
    id: 'legal-privacy-policy',
    title: 'Rellaey Privacy Policy',
    category: 'Legal',
    body: [
      'Through this Privacy Policy, Rellaey informs you about its personal information collection and use practices relating to your use of the Rellaey mobile application and its consumer-to-consumer marketplace service for swapping electronics and goods. This Policy does not cover other data collection or processing by data collected by third parties, or sites and services linked from our platform. This Privacy Policy is not a contract and does not create any legal rights or obligations not otherwise provided by law.',
      'Changes',
      'Carefully review this Privacy Policy. We may amend it from time to time as our technology, services, features, and business evolve, so you should review the current Privacy Policy each time you use our service. If we update this Privacy Policy, revisions will be effective as of the "Effective Date" listed above.',
      'Children',
      'Individuals under the age of 18 are not permitted to use the Rellaey service. If you are a parent or guardian and become aware that your child has provided personal information to us, please contact us as described in the "Contact Us" section below, and we will take reasonable steps to remove such information unless otherwise required by applicable law.',
      'Account Data',
      'When you sign up for Rellaey, you provide account registration information that you can access and update within the app at any time, including:',
      'Contact information, such as your name, address, phone number, and email address',
      'Profile details, such as your display name and avatar',
      'Payment information, used to process fees associated with no-show fees as described in our Terms of Service.',
      'We use this information to provide our services, improve the Rellaey platform, and communicate with you. For example, we use your email to notify you about swaps, transactions, and new features, and your mailing address to facilitate item delivery.',
      'We also collect information generated through your use of the marketplace, including messages, listings, and transaction events. We use this to operate the platform, prevent abuse, and provide customer support.',
      'We may use your payment information to process fees associated with confirmed exchanges, including no-show fees as described in our Terms of Service.',
      'We store and display content you upload, such as listing photos and proof screenshots submitted for support purposes. Do not upload sensitive personal information that you do not want shared or reviewed.',
      'Usage Data',
      'When you use Rellaey, we process information about your activity on the platform — including items listed for swap, messages exchanged with other users, and exchange history.',
      'Location Data',
      'When you request a swap, we may collect your location and link it to your account. This helps us show your real-time location to the other party during your exchange meetup.',
      'We determine your approximate location by default. If you allow precise location access through your phone\'s settings, we\'ll collect your precise location from the moment you request a swap until the exchange is completed or the item is received.',
      'You can use Rellaey without enabling precise location, though some features may be less convenient.',
      'Approximate location',
      'Precise location',
      'Data Access and Retention',
      'You can review, edit, or close your account at any time through your Rellaey account settings. We retain account and usage data as long as required or permitted by applicable law, including to collect fees owed, resolve disputes, complete investigations, prevent fraud, and enforce our Terms of Service.',
      'Disclosures & Sharing',
      'We may share the personal information we collect in the following circumstances:',
      'With your consent or at your direction (including with another Rellaey user to facilitate a swap or sale you have entered into)',
      'To process a product or service requested by you, or to otherwise deliver our service',
      'To enable contracted service providers to support operations such as fraud prevention, risk management, billing, marketing, shipping, customer support, and technology services',
      'As necessary to resolve disputes between Rellaey users or with third parties',
      'With affiliated and unaffiliated service providers that help us deliver, analyze, and improve our platform',
      'As required by law, in response to lawful government or third-party requests, or to assert or protect legal rights',
      'To comply with anti-money laundering and counter-terrorist financing requirements',
      'As necessary to protect users, Rellaey, or third parties from fraud, security breaches, or physical harm',
      'To maintain or service your account',
      'In connection with a proposed or actual sale, reorganization, or bankruptcy of all or part of our company or assets, subject to applicable law',
      'As described in this Policy or otherwise permitted by law',
      'Please note that publicly posted content - such as item listings - is visible to other users and third parties.',
      'Your Choices and Rights',
      'Your Choices. If you no longer wish to receive push notifications from Rellaey, you can adjust your preferences in the app\'s settings. If we send marketing messages, you may opt out by updating your Rellaey profile settings, contacting us at contact@rellaey.com, or following the opt-out instructions within the communication. Note that even if you opt out of marketing messages, we may still send you transactional or account-related communications.',
      'Your Rights. In accordance with applicable law, you may have the right to:',
      'Request Access to your personal information, including confirmation of processing, copies of your data, and data portability',
      'Request Correction of inaccurate or incomplete personal information',
      'Request Deletion of your personal information',
      'Appeal our decision to decline your request',
      'To exercise any of these rights, please contact us through the Help Center in the Rellaey app or email contact@rellaey.com. We will process requests in accordance with applicable law.',
      'Contact Us',
      'If you have any questions about this Privacy Policy, please contact us through the Help Center in the Rellaey app or directly at contact@rellaey.com. Please include "Privacy Policy" in the subject line of your inquiry.',
    ],
  },
  'listing-how-to-list': {
    id: 'listing-how-to-list',
    title: 'How to list your gadget',
    category: 'Listing',
    body: [
      'To list a gadget on Rellaey, start from the List tab and select the category that best fits your device, such as Phones, Laptops, or Console. We will guide you through choosing the exact model and key specs.',
      'Next, you will answer a few questions about the condition, storage, and included accessories. Clear, honest answers here help buyers set the right expectations and reduce disputes at the meetup.',
      'Add bright, in‑focus photos that show the front, back, edges, and any notable wear. Avoid heavy filters so the item looks the same in person as it does in your listing.',
      'When you submit your listing, we will calculate a credit value based on recent market data and your answers. You can review this value before publishing and decide whether to go live or adjust details and try again.',
    ],
  },
  'listing-condition-guide': {
    id: 'listing-condition-guide',
    title: 'Condition guide and photos',
    category: 'Listing',
    body: [
      'Rellaey uses a simple set of condition labels—Like New, Excellent, Good, Fair, and Poor—to describe how your gadget looks and functions. Choosing the right label keeps swaps fair and builds trust.',
      'Like New and Excellent are for items with almost no visible wear and full, reliable functionality. Good is for normal, light signs of use, such as tiny scuffs that do not affect performance.',
      'Fair and Poor are for items with heavier cosmetic wear, battery degradation, or minor functional issues that a buyer should know about in advance. If anything is cracked, dented, or partially broken, explain it clearly in your description.',
      'Your photos should back up the condition you choose: show close‑ups of corners, ports, and any marks. Natural lighting and a clean background make it easier for other members to trust what they are seeing.',
    ],
  },
  'listing-edit-remove': {
    id: 'listing-edit-remove',
    title: 'Editing or removing a listing',
    category: 'Listing',
    body: [
      'You can edit most details of your listing as long as there is no active swap in progress. This is useful if you want to improve your photos, clarify the description, or update included accessories.',
      'If a buyer has already started a swap with your listing, some fields are locked to prevent confusion. In that case, coordinate with the buyer in messages or wait until the swap is completed or cancelled.',
      'When you no longer want to offer an item, you can cancel or remove the listing from your profile. If you see a message that you need more credits or that an active swap is blocking removal, check your “My Swaps” page to resolve those first.',
      'Removed listings disappear from search and category pages, but may still appear in past conversations as historical context. Other members will not be able to start new swaps with an item once its listing is removed.',
    ],
  },
  'swap-starting-with-credits': {
    id: 'swap-starting-with-credits',
    title: 'Starting a swap with credits',
    category: 'Swap',
    body: [
      'When you find a gadget you like, tap “Swap with Credits” on the listing to begin. We will show you the credit amount required and your current balance before you confirm.',
      'After you confirm, the credits are held from your balance and a dedicated swap thread is created between you and the seller. This thread is where you will coordinate pickup times and locations.',
      'Holding credits up front gives the seller confidence that you are serious and that the value is available. It also makes it easier for Rellaey to return credits automatically if the swap is cancelled according to our rules.',
      'If you do not yet have enough credits, we will let you know and suggest listing your own gadgets first. You can always bookmark the item in your wishlist and come back once your balance is higher.',
    ],
  },
  'swap-pickup-times-locations': {
    id: 'swap-pickup-times-locations',
    title: 'Pickup times and locations',
    category: 'Swap',
    body: [
      'Once a swap is created, you will be prompted to propose several pickup time windows. Offering multiple options makes it easier for the other member to find something that works for both of you.',
      'Some sellers share more than one suggested meetup location, such as two different public spots in their area. If that is the case, you will be able to choose which one you prefer before sending your proposal.',
      'When the other member accepts a time and place, the swap shows a clear “Pickup time confirmed” state in your messages. Use that confirmation as the single source of truth if your plans feel unclear.',
      'Always choose well‑lit, public locations and avoid last‑minute changes to private addresses. If something about the location feels unsafe, cancel the swap or contact support before you go.',
    ],
  },
  'swap-rating-partner': {
    id: 'swap-rating-partner',
    title: 'Rating your swap partner',
    category: 'Swap',
    body: [
      'After a swap is marked completed, Rellaey may invite you to rate the other member. Ratings help the community understand who reliably shows up and describes their items accurately.',
      'Try to base your rating on the full experience: communication, punctuality, how closely the item matched the listing, and how any small issues were handled in person.',
      'You can optionally leave a short comment with your rating. Keep it factual and respectful—comments that include harassment or personal information may be removed and could impact your own account.',
      'Once submitted, ratings may not be editable, so take a moment to make sure they reflect your honest experience. If you believe a rating you received is clearly unfair or abusive, contact support with details.',
    ],
  },
  'membership-rellaey-plus': {
    id: 'membership-rellaey-plus',
    title: 'What Rellaey+ means',
    category: 'Membership',
    body: [
      'Rellaey+ is a badge for members who consistently complete swaps in good standing and meet our trust and quality guidelines. You might see the Rellaey+ pill on certain listings or profiles.',
      'These members typically have a history of accurate descriptions, on‑time meetups, and positive ratings. The badge is meant to signal that you can expect a smoother experience with them.',
      'Rellaey+ does not mean that Rellaey owns the item or guarantees every detail, but it does indicate that we have extra confidence in that member based on past behavior.',
      'If you would like to work toward Rellaey+ status, focus on clear listings, quick replies, safe meetups, and resolving small issues fairly. Over time, good behavior across multiple swaps helps your account qualify.',
    ],
  },
  'membership-verified-tech': {
    id: 'membership-verified-tech',
    title: 'Verified Tech and protections',
    category: 'Membership',
    body: [
      'Some listings are marked as “Verified Tech.” This means Rellaey or trusted partners have performed extra checks to confirm key details, such as model, storage, and basic functionality.',
      'Verified Tech items are chosen selectively, often for higher‑value gadgets where extra assurance matters most. The verification process may include IMEI or serial checks and in‑person inspection.',
      'Buying Verified Tech does not remove all risk, but it gives you an added layer of confidence that the item matches what is shown. When issues arise, Rellaey may offer additional support options for these listings.',
      'If you believe a Verified Tech item you received has a serious undisclosed problem, contact support as soon as possible with photos and a description of the issue so we can review your protections.',
    ],
  },
  'safety-meetup-checklist': {
    id: 'safety-meetup-checklist',
    title: 'Meetup safety checklist',
    category: 'Safety',
    body: [
      'Always meet in a public, well‑lit location, such as a café, shopping center, or police‑recommended exchange area. Avoid private homes or secluded spots whenever possible.',
      'Let a friend or family member know where you are going and share the time and location. If you feel more comfortable, bring someone with you to the meetup.',
      'At the meetup, take a moment to inspect the item against the listing: turn it on, check basic functions, and confirm accessories. Do not rush if something feels off or different than described.',
      'If you ever feel unsafe, trust your instincts—leave the location and contact support from a safe place. Swaps can be cancelled if the situation is not right; your safety comes first.',
    ],
  },
  'safety-blocking-reporting': {
    id: 'safety-blocking-reporting',
    title: 'Blocking and reporting another user',
    category: 'Safety',
    body: [
      'If another member makes you uncomfortable, sends spam, or behaves inappropriately, you can block them. Blocking prevents new messages and future swaps between your accounts.',
      'For more serious issues—such as harassment, threats, or suspected fraud—use the report option or contact support directly with as much detail as you can safely provide.',
      'Our team reviews reports and may restrict or remove accounts that violate our policies. While we cannot share every action we take, your reports help keep the community safe for everyone.',
      'In urgent situations where your immediate safety is at risk, contact local authorities first, then let us know what happened so we can review the account involved.',
    ],
  },
  'returns-swap-reversed': {
    id: 'returns-swap-reversed',
    title: 'When a swap can be reversed',
    category: 'Returns',
    body: [
      'Most swaps are final once completed at the meetup, but in some limited cases a swap can be reversed. This usually requires clear proof that the item was significantly not as described or that serious misrepresentation occurred.',
      'If you believe a swap should be reversed, contact support as soon as possible with photos, a description of the issue, and the swap ID. The more specific and timely your report, the easier it is for us to help.',
      'Rellaey will review the conversation history, listing details, and any evidence from both sides before deciding whether to adjust credits or request that the item be returned.',
      'Because reversing a swap affects both members, these decisions are made carefully and are not guaranteed. Whenever possible, try to resolve small misunderstandings directly at the meetup before finalizing the swap.',
    ],
  },
  'returns-item-condition-disputes': {
    id: 'returns-item-condition-disputes',
    title: 'Handling disputes about item condition',
    category: 'Returns',
    body: [
      'Disagreements about condition usually come from different expectations. This is why accurate labels, detailed descriptions, and clear photos are so important before the meetup.',
      'If you arrive and feel the condition is worse than advertised, calmly point out the differences to the other member. You are never required to complete the swap if the item does not match the listing.',
      'If the other member refuses to acknowledge a clear discrepancy or pressures you to continue, walk away and contact support with photos and a summary of what happened.',
      'When we review condition disputes, we look at what was claimed in the listing versus what the evidence shows. Outcomes may include warnings, rating adjustments, or in rare cases, credit changes when misrepresentation is obvious.',
    ],
  },
};

function HelpArticlePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const from = searchParams.get('from'); // 'login' | 'signup' when opened from auth screens
  const articleId = (params.articleId ?? '') as string;
  const article = ARTICLES[articleId as ArticleId] ?? null;
  const [helpful, setHelpful] = React.useState<'yes' | 'no' | null>(null);

  const exitTo = from === 'login' ? '/login' : from === 'signup' ? '/signup' : '/help';
  const helpHomeHref = from ? `/help?from=${from}` : '/help';

  if (!article) {
    return (
      <div className="flex flex-col h-full bg-relay-surface dark:bg-relay-surface-dark px-6 pb-16 transition-colors">
        <header
          className="pb-5 border-b border-relay-border dark:border-relay-border-dark flex items-center justify-between bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30 -mx-6 px-6 pt-safe-3"
        >
          <button
            onClick={() => router.push(exitTo)}
            className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-base font-semibold text-relay-text dark:text-relay-text-dark">
            Rellaey Help
          </h1>
          <div className="w-10" aria-hidden />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-relay-muted mb-4">This help article could not be found.</p>
          <NextStepButton
            type="button"
            onClick={() => router.push(helpHomeHref)}
            className="px-8 py-3 rounded-2xl tracking-widest"
          >
            Back to Help Home
          </NextStepButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <div className="page-scroll">
      <header
        className="sticky top-0 px-6 pb-4 border-b border-relay-border dark:border-relay-border-dark flex items-center justify-between bg-relay-surface/95 dark:bg-relay-surface-dark/95 backdrop-blur-md z-30 pt-safe-3"
      >
        <button
          onClick={() => router.push(exitTo)}
          className="flex size-10 items-center justify-center rounded-full bg-relay-surface dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark shadow-sm active-scale"
          aria-label="Close article"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Rellaey Help
        </h1>
        <div className="w-10" aria-hidden />
      </header>

      <main className="px-6 pt-4 pb-20 space-y-8">
        <button
          type="button"
          onClick={() => router.push(helpHomeHref)}
          className="flex items-center text-xs text-relay-muted hover:text-relay-text dark:hover:text-relay-text-dark gap-1 mb-2"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to help home</span>
        </button>

        <div className="relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-relay-muted">
            search
          </span>
          <input
            className="w-full h-12 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl pl-14 pr-5 text-sm text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-1 focus:ring-primary/30 outline-none transition-all"
            placeholder="Search help articles"
          />
        </div>

        <article className="space-y-5">
          <header className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-relay-muted uppercase">
              {article.category}
            </p>
            <h2 className="text-2xl font-semibold leading-snug text-relay-text dark:text-relay-text-dark">
              {article.title}
            </h2>
          </header>

          <div className="space-y-4 text-sm leading-relaxed text-relay-text dark:text-relay-text-dark">
            {article.body.map((paragraph, idx) => {
              const isPrivacySubtitle =
                article.id === 'legal-privacy-policy' &&
                [
                  'Changes',
                  'Children',
                  'Account Data',
                  'Usage Data',
                  'Location Data',
                  'Data Access and Retention',
                  'Disclosures & Sharing',
                  'Your Choices and Rights',
                  'Contact Us',
                ].includes(paragraph);
              const isTosSubtitle =
                article.id === 'legal-terms-of-service' && /^\d+\./.test(paragraph);
              const isSubtitle = isPrivacySubtitle || isTosSubtitle;

              return (
                <p key={idx} className={isSubtitle ? 'font-medium' : undefined}>
                  {paragraph}
                </p>
              );
            })}
          </div>
        </article>

        {articleId === 'account-delete-pause' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/help/close-account')}
              className="text-sm font-semibold text-primary hover:underline underline-offset-2"
            >
              delete my account
            </button>
          </div>
        )}

        <section className="pt-4 space-y-4">
          <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
            Was this article helpful?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setHelpful('yes')}
              className={`flex-0 px-6 h-9 rounded-full border text-sm font-medium active-scale ${
                helpful === 'yes'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-relay-bg dark:bg-relay-bg-dark border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setHelpful('no')}
              className={`flex-0 px-6 h-9 rounded-full border text-sm font-medium active-scale ${
                helpful === 'no'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-relay-bg dark:bg-relay-bg-dark border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark'
              }`}
            >
              No
            </button>
          </div>
          {helpful && (
            <p className="text-[11px] text-relay-muted dark:text-relay-muted-light">
              Thanks for your feedback.
            </p>
          )}
        </section>

        <section className="space-y-1">
          <p className="text-sm font-medium text-relay-text dark:text-relay-text-dark">
            Need more help?
          </p>
          <button
            type="button"
            onClick={() => router.push('/help/contact')}
            className="text-sm font-semibold text-primary"
          >
            Contact us
          </button>
        </section>
      </main>
      </div>
    </div>
  );
}

export default function HelpArticlePage() {
  return (
    <Suspense>
      <HelpArticlePageContent />
    </Suspense>
  );
}
