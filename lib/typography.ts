export const type = {
  /**
   * XL-35-NORMAL — 35px, 400
   * Use: banners / maximum display
   */
  xl: 'text-[35px] font-normal leading-[1.618] tracking-tighter',

  /**
   * TITLE1-28-BOLD — 28px, 700
   * Use: primary page title
   */
  h1: 'text-[28px] font-normal leading-[1.618] tracking-tighter',

  /**
   * TITLE2-24-REGULAR — 24px, 400
   * Use: secondary title
   */
  h2: 'text-[24px] font-normal leading-[1.618] tracking-tighter',

  /**
   * MEDIUM-20-SEMIBOLD — 20px, 600
   * Use: tertiary title
   */
  h3: 'text-[20px] font-normal leading-[1.618] tracking-tighter',

  /**
   * BASIC-16-BOLD — 16px, 700
   * Use: CTAs and bold paragraphs
   */
  basicBold: 'text-[16px] font-normal leading-[1.618]',

  /**
   * BASIC-16-NORMAL — 16px, 400
   * Use: body text
   */
  body: 'text-[16px] font-normal leading-[1.618]',

  /**
   * SMALL-14-NORMAL — 14px, 400
   * Use: supporting text
   */
  small: 'text-[14px] font-normal leading-[1.618]',

  /**
   * XS-12-NORMAL — 12px, 400
   * Use: captions / labels
   */
  caption: 'text-[12px] font-normal leading-[1.618]',

  /**
   * Label text (12px) following XS-12-NORMAL
   */
  label: 'text-[12px] font-normal leading-[1.618] tracking-tigh',

  /**
   * Button text — align to BASIC-16-* height and ratio
   * (we keep 12px text but with golden-ratio line-height for comfortable buttons)
   */
  button: 'text-[12px] font-semibold leading-[1.618]',

  /**
   * Price / numeric highlight — 16px bold
   */
  price: 'text-[16px] font-semibold leading-[1.618]',
} as const;

export type TypographyRole = keyof typeof type;

/**
 * Micro-caps label pattern used throughout the app for form field labels,
 * nav item labels, section eyebrows, and badges.
 *
 * @example
 *   <label className={`${microLabel} text-relay-muted`}>Category</label>
 */
export const microLabel = 'text-[12px] font-normal tracking-[0.2em]';
