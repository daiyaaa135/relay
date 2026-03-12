'use client';

import { useEffect, useState } from 'react';

const letters = ['R', 'e', 'l', 'l', 'a', 'e', 'y'];
const ACCENT_INDICES = [2, 5];

// Brand colors for splash: primary orange + warm gold accent
const PRIMARY_COLOR = '#FF5721';
const ACCENT_COLOR = '#FBC881';

type SplashScreenProps = {
  onDone?: () => void;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100svh',
    maxWidth: '430px',
    margin: '0 auto',
    backgroundColor: '#fff8f4',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    overflow: 'hidden' as const,
    gap: '16px',
  },
  brandName: {
    display: 'flex',
    gap: '2px',
    fontSize: 'clamp(3rem, 16vw, 4.5rem)',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  letter: {
    display: 'inline-block',
  },
  bar: {
    height: '3px',
    background: `linear-gradient(90deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR})`,
    borderRadius: '2px',
  },
  tagline: {
    fontSize: 'clamp(0.7rem, 3.5vw, 0.9rem)',
    fontWeight: 300,
    letterSpacing: '0.3em',
    color: ACCENT_COLOR,
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  spinnerWrap: {
    marginTop: '32px',
  },
  spinnerTrack: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #fde8d8',
    position: 'relative' as const,
    boxSizing: 'border-box' as const,
  },
  spinnerArc: {
    position: 'absolute' as const,
    inset: '-3px',
    borderRadius: '50%',
    border: '3px solid transparent',
    borderTopColor: PRIMARY_COLOR,
    borderRightColor: ACCENT_COLOR,
    animation: 'spin 0.9s linear infinite',
    boxSizing: 'border-box' as const,
  },
} as const;

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Start letter animation
    const t1 = setTimeout(() => setVisible(true), 100);
    // Show spinner after letters settle
    const t2 = setTimeout(() => setShowSpinner(true), 1500);
    // Finish splash after 3s
    const t3 = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  if (!visible) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Brand Name */}
      <div style={styles.brandName}>
        {letters.map((char, i) => (
          <span
            key={`${char}-${i}`}
            style={{
              ...styles.letter,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.5s ${i * 0.08 + 0.2}s ease-out, transform 0.5s ${
                i * 0.08 + 0.2
              }s ease-out`,
              // Accent color play — 3rd & 6th letters use warm gold, others use primary orange
              color: ACCENT_INDICES.includes(i) ? ACCENT_COLOR : PRIMARY_COLOR,
            }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Underline bar */}
      <div
        style={{
          ...styles.bar,
          width: visible ? '72%' : '0%',
          transition: 'width 0.6s 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Tagline */}
      <p
        style={{
          ...styles.tagline,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.6s 0.9s ease-out, transform 0.6s 0.9s ease-out',
        }}
      >
        Your local marketplace
      </p>

      {/* Spinner */}
      <div style={styles.spinnerWrap}>
        {showSpinner && (
          <div style={styles.spinnerTrack}>
            <div style={styles.spinnerArc} />
          </div>
        )}
      </div>
    </div>
  );
}

