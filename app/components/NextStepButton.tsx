'use client';

import React from 'react';

type NextStepButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: 'button' | 'a';
};

export function NextStepButton({
  children,
  className = '',
  as = 'button',
  ...rest
}: NextStepButtonProps) {
  const baseClasses = 'next-step-button text-white font-semibold text-xs';
  const combined = `${baseClasses} ${className}`.trim();

  if (as === 'a') {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return (
      <a className={combined} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={combined} {...rest}>
      {children}
    </button>
  );
}

