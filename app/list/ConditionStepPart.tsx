'use client';

import React from 'react';

const CONDITION_GRADES = ['Poor', 'Fair', 'Good', 'Mint', 'New'] as const;
const CONDITION_ORDER = { Poor: 0, Fair: 1, Good: 2, Mint: 3, New: 4 };
const CONDITION_IMAGES_FRONT: Record<string, string> = {
  Poor: '/images/condition/poor.png',
  Fair: '/images/condition/fair.png',
  Good: '/images/condition/good.png',
  Mint: '/images/condition/mint.png',
  New: '/images/condition/new.png',
};
const CONDITION_IMAGES_BACK: Record<string, string> = {
  Poor: '/images/condition/back/poor.png',
  Fair: '/images/condition/back/fair.png',
  Good: '/images/condition/back/good.png',
  Mint: '/images/condition/back/mint.png',
  New: '/images/condition/back/new.png',
};

const DEVICE_LOOK_CATEGORIES = ['Video Games', 'MP3', 'Gaming Handhelds', 'Console', 'Headphones', 'Speaker'] as const;
const CONDITION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'Video Games': {
    Poor: 'Heavy scratches, scuffs, or cracks on disc/cartridge and case. Case may be broken or missing entirely. Manual absent.',
    Fair: 'Visible scratches and wear on disc/cartridge and case. Case may have cracks or heavy scuffing. Manual likely missing.',
    Good: 'Minor surface scratches on disc/cartridge. Case shows light wear. Manual may or may not be included.',
    Mint: 'Near-perfect cosmetic condition. Disc/cartridge and case are clean and well-preserved. Manual included.',
    New: 'Factory sealed. No signs of opening or use. All original packaging and inserts present.',
  },
  MP3: {
    Poor: 'Deep scratches across screen and body. Heavy scuffing, dents, or discoloration.',
    Fair: 'Noticeable scratches and scuffs on screen and body. Visible signs of heavy use.',
    Good: 'Light scratches on body. Screen has minor scuffs but remains clear.',
    Mint: 'Barely visible marks. Excellent cosmetic appearance overall.',
    New: 'Unopened, in original packaging with all accessories. No marks or blemishes.',
  },
  'Gaming Handhelds': {
    Poor: 'Cracked casing, heavy scratches on screen and body, missing parts or covers.',
    Fair: 'Significant scratching on screen and shell. Heavy cosmetic wear throughout.',
    Good: 'Light scratches on body. Screen is clear with minimal marks.',
    Mint: 'Minimal cosmetic wear. Looks nearly new with no notable marks or damage.',
    New: 'Brand new in original box with all accessories. Never used.',
  },
  Console: {
    Poor: 'Cracks, deep scratches, heavy discoloration or yellowing on shell.',
    Fair: 'Significant scuffs, scratches, or yellowing on the housing. Heavy cosmetic wear.',
    Good: 'Light surface scratches on shell. Minor cosmetic blemishes only.',
    Mint: 'Excellent cosmetic condition with minimal signs of use.',
    New: 'Factory sealed in original box with all accessories. Pristine condition.',
  },
  Headphones: {
    Poor: 'Ear pads heavily cracked, torn, or missing. Headband visibly damaged or peeling.',
    Fair: 'Ear pads show significant wear or peeling. Headband has visible scratches or cracks.',
    Good: 'Light wear on ear pads and headband. Minor scuffs or marks only.',
    Mint: 'Ear pads and headband are clean and intact. Looks nearly new.',
    New: 'Unopened with all original packaging and accessories. No wear of any kind.',
  },
  Speaker: {
    Poor: 'Torn or punctured grille, cracked or dented housing. Heavy cosmetic damage throughout.',
    Fair: 'Grille shows wear or minor damage. Housing has visible scuffs and scratches.',
    Good: 'Light scratches or scuffs on housing. Grille is intact with minimal marks.',
    Mint: 'Excellent cosmetic appearance. Minimal to no visible marks or blemishes.',
    New: 'Brand new and unused. Original packaging and all accessories included.',
  },
};

export function getWorstCondition(
  front: string | null,
  back: string | null,
  top: string | null,
  bottom: string | null,
  left: string | null,
  right: string | null
): string | null {
  const all = [front, back, top, bottom, left, right].filter(Boolean) as string[];
  if (all.length === 0) return null;
  const worst = all.reduce((a, b) =>
    CONDITION_ORDER[a as keyof typeof CONDITION_ORDER] <= CONDITION_ORDER[b as keyof typeof CONDITION_ORDER] ? a : b
  );
  return worst;
}

interface ConditionStepPartProps {
  question: string;
  value: string | null;
  onChange: (v: string) => void;
  /** Called when the user taps "Change" on the collapsed summary. Parent should reset value to null. */
  onClear?: () => void;
  variant?: 'front' | 'back';
  /** When set to a device-look category (Video Games, MP3, etc.), shows descriptions instead of images. */
  category?: string;
  /** When true, reveals the battery health input after the user selects a condition. */
  showBatteryHealth?: boolean;
  batteryHealth?: string;
  onBatteryHealthChange?: (v: string) => void;
}

export function ConditionStepPart({
  question,
  value,
  onChange,
  onClear,
  variant = 'front',
  category,
  showBatteryHealth = false,
  batteryHealth = '',
  onBatteryHealthChange,
}: ConditionStepPartProps) {
  const isSelected = value !== null;
  const useLimitedGrades = category === 'Console' || category === 'Speaker';
  const grades = useLimitedGrades ? (['Good', 'Mint', 'New'] as const) : CONDITION_GRADES;
  const defaultGrade = useLimitedGrades ? 'Good' : 'Poor';
  const selected = value ?? defaultGrade;
  const images = variant === 'back' ? CONDITION_IMAGES_BACK : CONDITION_IMAGES_FRONT;
  const imgSrc = images[selected] ?? images.Poor;
  const useDescriptions = category && (DEVICE_LOOK_CATEGORIES as readonly string[]).includes(category);
  const descriptions = useDescriptions ? CONDITION_DESCRIPTIONS[category] : null;
  const descriptionText = descriptions?.[selected] ?? '';

  const handleBatteryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') { onBatteryHealthChange?.(''); return; }
    const n = parseInt(raw, 10);
    if (n > 100) { onBatteryHealthChange?.('100'); return; }
    onBatteryHealthChange?.(raw);
  };

  return (
    <div className="space-y-6">

      {/* ── Question header — always visible ── */}
      <div className="flex items-center justify-between min-h-[28px]">
        <h2 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">
          {question}
        </h2>
        {isSelected && (
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-sm font-bold text-primary">{value}</span>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-relay-muted underline underline-offset-2 hover:text-relay-text dark:hover:text-relay-text-dark transition-colors"
              >
                Change
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Collapsible: preview card + grade buttons ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isSelected ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[600px] opacity-100'
        }`}
      >
        <div className="space-y-6">
          {/* Preview card */}
          <div
            className={`rounded-xl overflow-hidden border border-relay-border dark:border-relay-border-dark aspect-[4/3] flex items-center justify-center p-6 ${
              useDescriptions ? 'bg-relay-bg dark:bg-relay-bg-dark' : 'bg-relay-surface dark:bg-relay-surface-dark'
            }`}
          >
            {useDescriptions ? (
              <p className="text-sm text-gray-700 dark:text-gray-700 font-bold text-center leading-relaxed">
                {descriptionText}
              </p>
            ) : (
              <img src={imgSrc} alt={selected} className="w-full h-full object-cover object-bottom" />
            )}
          </div>

          {/* Grade buttons */}
          <div className="grid grid-cols-2 gap-3">
            {grades.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => onChange(grade)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  value === grade
                    ? 'border-transparent bg-primary/10 dark:bg-primary/20'
                    : 'border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark hover:border-relay-muted'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    value === grade ? 'border-transparent bg-primary' : 'border-relay-muted'
                  }`}
                >
                  {value === grade && <span className="w-2 h-2 rounded-full bg-relay-bg dark:bg-relay-bg-dark" />}
                </span>
                <span className="text-sm font-medium text-relay-text dark:text-relay-text-dark">{grade}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Battery health — revealed after condition is selected ── */}
      {showBatteryHealth && isSelected && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-relay-text dark:text-relay-text-dark">
            What&apos;s the battery health?
          </h2>
          <div className="flex items-center gap-3 bg-relay-bg dark:bg-relay-bg-dark rounded-xl px-4 py-3 border border-relay-border dark:border-relay-border-dark focus-within:border-primary/80 transition-colors">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="e.g. 87"
              value={batteryHealth}
              onChange={handleBatteryInput}
              className="flex-1 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none text-3xl font-bold tracking-tighter leading-none"
            />
            <span className="text-2xl font-bold text-relay-muted leading-none select-none">%</span>
          </div>
          <p className="text-[11px] text-relay-muted">
            Find this in Settings → Battery. Enter a number between 1 and 100.
          </p>
        </div>
      )}
    </div>
  );
}
