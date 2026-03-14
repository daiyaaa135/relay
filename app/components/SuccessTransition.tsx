'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const ORANGE = '#f04e0f';

// Durations between phase transitions (ms)
const STEPS = [1200, 400, 300, 500, 600, 200, 1400, 700];
// phases:
// 0 → initial (spinner + loading text)
// 1 → stop spinner, show outline check
// 2 → swap text
// 3 → fill circle orange + white check
// 4 → expand circle to large round
// 5 → begin slow fill
// 6 → orange fills screen
// 7 → white panel slides up
// 8 → done

function useSequence(steps: number[]) {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<number[]>([]);

  const run = useCallback(() => {
    timerRef.current.forEach((id) => window.clearTimeout(id));
    timerRef.current = [];
    setPhase(0);
    let acc = 0;
    steps.forEach((ms, i) => {
      acc += ms;
      const id = window.setTimeout(() => setPhase(i + 1), acc);
      timerRef.current.push(id);
    });
  }, [steps]);

  useEffect(() => {
    const id = window.setTimeout(run, 400);
    return () => {
      window.clearTimeout(id);
      timerRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, [run]);

  return [phase, run] as const;
}

type SuccessTransitionProps = {
  onComplete?: () => void;
};

export function SuccessTransition({ onComplete }: SuccessTransitionProps) {
  const [phase, replay] = useSequence(STEPS);
  const hasCompletedRef = useRef(false);

  // Fire completion callback once the full sequence has finished
  useEffect(() => {
    if (!onComplete) return;
    if (phase >= 8 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [phase, onComplete]);

  // Derived booleans
  const showSpinner = phase < 1;
  const showOutlineCheck = phase >= 1 && phase < 3;
  const circleFilled = phase >= 3;
  const showWhiteCheck = phase >= 3 && phase < 4;
  const circleExpanded = phase >= 4;
  const circleHidden = phase >= 5;
  const orangeExpanding = phase >= 5;
  const panelUp = phase >= 7;

  const showReplay = phase >= 8;

  // Circle size: small → large round
  const circleSize = circleExpanded ? 280 : 64;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#e8e8e8]">
      <div
        className="relative bg-white rounded-[52px] overflow-hidden"
        style={{
          width: 390,
          height: 780,
          boxShadow:
            '0 60px 140px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        {/* Scene */}
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
          {/* Message */}
          <div
            className="absolute left-8 right-8 top-[68px] z-10 text-[23px] font-semibold leading-[1.3] tracking-[-0.025em] transition-opacity duration-300"
            style={{
              opacity: phase === 0 ? 0 : phase >= 6 ? 0 : 1,
              color: phase >= 5 ? '#fff' : '#111',
            }}
          >
            {phase < 2 ? (
              <>
                Thanks! Give us a
                <br />
                few seconds...
              </>
            ) : (
              'Yes, all set!'
            )}
          </div>

          {/* Circle */}
          <div
            style={{
              position: 'relative',
              zIndex: 20,
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              border: circleFilled
                ? 'none'
                : showOutlineCheck
                ? '2px solid #111'
                : '2px solid #ddd',
              background: circleFilled ? ORANGE : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: circleHidden ? 0 : 1,
              transition: [
                `width ${
                  circleExpanded ? '0.75s' : '0.3s'
                } cubic-bezier(0.34,1.3,0.64,1)`,
                `height ${
                  circleExpanded ? '0.75s' : '0.3s'
                } cubic-bezier(0.34,1.3,0.64,1)`,
                'background 0.35s ease',
                'border 0.3s ease',
                'opacity 0.2s ease',
              ].join(', '),
            }}
          >
            {/* Spinner */}
            <div
              className="absolute h-[60px] w-[60px] rounded-full border-2 border-transparent border-t-[#444] animate-spin transition-opacity duration-200"
              style={{ opacity: showSpinner ? 1 : 0 }}
            />

            {/* Outline check (dark) */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              style={{
                position: 'absolute',
                opacity: showOutlineCheck ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <path
                d="M7 14.5 L12 20 L21 10"
                stroke="#111"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 32,
                  strokeDashoffset: showOutlineCheck ? 0 : 32,
                  transition:
                    'stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1) 0.05s',
                }}
              />
            </svg>

            {/* Filled check (white) */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              style={{
                position: 'absolute',
                opacity: showWhiteCheck ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <path
                d="M7 14.5 L12 20 L21 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 32,
                  strokeDashoffset: showWhiteCheck ? 0 : 32,
                  transition:
                    'stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1) 0.05s',
                }}
              />
            </svg>
          </div>

          {/* Orange flood — perfect circle that slowly scales up */}
          <div
            className="pointer-events-none absolute z-30 rounded-full bg-[var(--orange,rgba(240,78,15,1))]"
            style={{
              ['--orange' as string]: ORANGE,
              width: 1200,
              height: 1200,
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${
                orangeExpanding ? 1 : 0
              })`,
              transition: orangeExpanding
                ? 'transform 1.3s cubic-bezier(0.4, 0, 0.15, 1)'
                : 'none',
            }}
          />
        </div>

        {/* Sliding content panel */}
        <div
          className="absolute bottom-0 left-0 right-0 z-40 flex h-[58%] flex-col gap-[14px] bg-white px-8 pb-10 pt-9 rounded-t-[36px] transition-transform duration-700"
          style={{
            transform: panelUp ? 'translateY(0%)' : 'translateY(100%)',
            transitionTimingFunction: 'cubic-bezier(0.34,1.18,0.64,1)',
          }}
        >
          <div className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#111]">
            You&apos;re all set!
          </div>
          <div className="text-[15px] font-normal leading-relaxed text-[#888]">
            Everything looks good. Your account has been created and you&apos;re
            ready to get started.
          </div>
        </div>

        {/* Replay */}
        {showReplay && (
          <button
            type="button"
            className="absolute bottom-[18px] left-1/2 z-[200] -translate-x-1/2 rounded-[20px] border-none bg-white/90 px-5 py-2 text-[12px] font-semibold tracking-[0.02em] text-[#555] shadow-[0_2px_14px_rgba(0,0,0,0.13)] backdrop-blur-md transition-opacity duration-400"
            onClick={() => {
              replay();
              hasCompletedRef.current = false;
            }}
          >
            ↺ Replay
          </button>
        )}
      </div>
    </div>
  );
}

