'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useListing } from '../ListingContext';
import { ListingStepHeader } from '../components/ListingStepHeader';

const PHONE_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Verification' },
  { step: 3, title: 'Front condition' },
  { step: 4, title: 'Back condition' },
  { step: 5, title: 'Functionality' },
  { step: 6, title: 'Photos' },
  { step: 7, title: 'Review' },
];

const LAPTOP_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Verification' },
  { step: 3, title: 'Front condition' },
  { step: 4, title: 'Back condition' },
  { step: 5, title: 'Functionality' },
  { step: 6, title: 'Photos' },
  { step: 7, title: 'Review' },
];

const TABLET_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Verification' },
  { step: 3, title: 'Front condition' },
  { step: 4, title: 'Back condition' },
  { step: 5, title: 'Functionality' },
  { step: 6, title: 'Photos' },
  { step: 7, title: 'Review' },
];

const NON_PHONE_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Front condition' },
  { step: 3, title: 'Back condition' },
  { step: 4, title: 'Functionality' },
  { step: 5, title: 'Photos' },
  { step: 6, title: 'Review' },
];

/** Console, Headphones, Gaming Handhelds, Speaker, MP3: no Back condition step; step 2 is overall condition (no "front"). */
const CONSOLE_LIKE_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Condition' },
  { step: 3, title: 'Functionality' },
  { step: 4, title: 'Photos' },
  { step: 5, title: 'Review' },
];

/** Video Games: no Front condition; 4 steps (Device → Functionality → Photos → Review). */
const VIDEO_GAMES_STEPS = [
  { step: 1, title: 'Your device' },
  { step: 2, title: 'Functionality' },
  { step: 3, title: 'Photos' },
  { step: 4, title: 'Review' },
];

const CONSOLE_LIKE_CATEGORIES = ['Console', 'Video Games', 'Headphones', 'Gaming Handhelds', 'Speaker', 'MP3'];

export default function StepLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { category, requestLeave, hasProgress } = useListing();
  const stepNum = parseInt(String(params.step ?? '1'), 10) || 1;
  const isPhoneFlow = category === 'Phones';
  const isLaptopFlow = category === 'Laptops';
  const isTabletFlow = category === 'Tablets';
  const isConsoleLikeFlow = CONSOLE_LIKE_CATEGORIES.includes(category);
  const steps = isPhoneFlow ? PHONE_STEPS : isLaptopFlow ? LAPTOP_STEPS : isTabletFlow ? TABLET_STEPS : category === 'Video Games' ? VIDEO_GAMES_STEPS : isConsoleLikeFlow ? CONSOLE_LIKE_STEPS : NON_PHONE_STEPS;
  const totalSteps = steps.length;
  const clampedStep = Math.max(1, Math.min(stepNum, totalSteps));
  const currentStepInfo = steps.find((s) => s.step === clampedStep) ?? steps[0];

  const goHome = () => router.push('/');

  const handleBack = () => {
    if (clampedStep > 1) {
      router.push(`/list/${clampedStep - 1}`);
    } else {
      if (hasProgress(clampedStep)) requestLeave(goHome);
      else goHome();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ListingStepHeader
        currentStep={clampedStep}
        totalSteps={totalSteps}
        title={currentStepInfo?.title ?? 'Step'}
        onBack={handleBack}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
