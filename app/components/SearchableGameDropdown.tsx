'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type Fuse from 'fuse.js';

export interface GameOption {
  name: string;
  loosePrice: number;
}

interface SearchableGameDropdownProps {
  value: string;
  onChange: (value: string) => void;
  consoleName: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const FUSE_OPTIONS = {
  keys: ['name'],
  threshold: 0.3,
  includeScore: true,
};

export function SearchableGameDropdown({
  value,
  onChange,
  consoleName,
  placeholder = 'Search or select game...',
  disabled = false,
  className = '',
}: SearchableGameDropdownProps) {
  const [search, setSearch] = useState(value);
  const [games, setGames] = useState<GameOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [FuseClass, setFuseClass] = useState<typeof Fuse | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load fuse.js only when the dropdown is first opened
  useEffect(() => {
    if (open && !FuseClass) {
      import('fuse.js').then((m) => setFuseClass(() => m.default));
    }
  }, [open, FuseClass]);

  useEffect(() => {
    if (!consoleName.trim()) {
      setGames([]);
      setSearch('');
      return;
    }
    setLoading(true);
    setGames([]);
    fetch(`/api/video-games/games?${new URLSearchParams({ console: consoleName.trim() })}`)
      .then((r) => r.json())
      .then((d: { games?: GameOption[] }) => setGames(Array.isArray(d.games) ? d.games : []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [consoleName]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const fuse = useMemo(() => FuseClass ? new FuseClass(games, FUSE_OPTIONS) : null, [FuseClass, games]);
  const searchTrim = search.trim();
  const filtered = searchTrim && fuse
    ? fuse.search(searchTrim).map((r) => r.item)
    : games;
  const showList = open && (loading ? false : filtered.length > 0 || searchTrim.length > 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (game: GameOption) => {
    onChange(game.name);
    setSearch(game.name);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearch(v);
    onChange(v);
    setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={
          !consoleName.trim()
            ? 'Select console first'
            : loading
              ? 'Loading games...'
              : placeholder
        }
        disabled={disabled || !consoleName.trim()}
        className="w-full h-12 bg-relay-surface dark:bg-relay-surface-dark border border-relay-border dark:border-relay-border-dark rounded-lg text-relay-text dark:text-relay-text-dark px-4 text-sm pr-8"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
      />
      {showList && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-relay-border dark:border-relay-border-dark bg-relay-surface dark:bg-relay-surface-dark shadow-lg py-1 text-sm"
          role="listbox"
        >
          {loading ? (
            <li className="px-4 py-3 text-relay-muted dark:text-relay-muted-light">Loading...</li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-3 text-relay-muted dark:text-relay-muted-light">
              {searchTrim ? 'No matches' : 'No games found'}
            </li>
          ) : (
            filtered.slice(0, 100).map((game) => (
              <li
                key={game.name}
                role="option"
                className="px-4 py-2 cursor-pointer hover:bg-relay-border/30 dark:hover:bg-relay-border-dark/30 truncate"
                onClick={() => handleSelect(game)}
              >
                {game.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
