'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchDevice } from '@/app/api/devices/search/route';

interface DeviceSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** When user selects a device, optionally navigate to its browse page */
  onSelectDevice?: (device: SearchDevice) => void;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 1;

export function DeviceSearchBar({
  value,
  onChange,
  placeholder = 'Search marketplace...',
  className = '',
  onSelectDevice,
}: DeviceSearchBarProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query.trim() || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/devices/search?${new URLSearchParams({ q: query.trim() })}`)
        .then((r) => r.json())
        .then((d: { devices?: SearchDevice[] }) => setResults(Array.isArray(d.devices) ? d.devices : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setQuery(text);
      onChange(text);
      setOpen(true);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (device: SearchDevice) => {
      const displayName = device.size ? `${device.name} ${device.size}` : device.name;
      setQuery(displayName);
      onChange(displayName);
      setOpen(false);
      onSelectDevice?.(device);
    },
    [onChange, onSelectDevice]
  );

  const handleFocus = () => setOpen(true);
  const showDropdown = open && (results.length > 0 || (query.length >= MIN_QUERY_LENGTH && loading));

  return (
    <div ref={containerRef} className={`relative flex-1 group ${className}`}>
      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-relay-muted dark:text-white/50 group-focus-within:text-primary transition-colors pointer-events-none z-10">
        search
      </span>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="search-bar-input w-full h-10 bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark rounded-2xl pl-12 pr-4 text-sm text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-[70vh] overflow-auto rounded-2xl border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark shadow-xl py-2 text-sm"
          role="listbox"
        >
          {loading ? (
            <li className="px-4 py-3 text-relay-muted dark:text-relay-muted-light flex items-center gap-3">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              Searching...
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-relay-muted dark:text-relay-muted-light">
              No devices found
            </li>
          ) : (
            results.map((device) => (
              <li
                key={device.id}
                role="option"
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-relay-bg dark:hover:bg-relay-bg-dark transition-colors"
                onClick={() => handleSelect(device)}
              >
                <div className="size-12 shrink-0 rounded-lg bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark flex items-center justify-center overflow-hidden">
                  {device.image_url ? (
                    <img
                      src={device.image_url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-2xl">
                      devices
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-relay-text dark:text-relay-text-dark font-medium truncate">
                    {device.name}
                    {device.size && (
                      <span className="text-relay-muted dark:text-relay-muted-light font-normal">
                        {' '}
                        {device.size}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
