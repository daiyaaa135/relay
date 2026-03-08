'use client';

import React, { useState, useMemo } from 'react';

export type PickupSlot = { date: string; start: string; end: string };

/** Seller weekly availability window (same shape as lib/availability AvailabilitySlot). */
export type SellerAvailabilitySlot = { dayOfWeek: number; start: string; end: string };

const MIN_SLOTS = 1;
const MIN_HOURS_FROM_NOW = 4;
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** True if the 1-hour slot [slotStart, slotEnd) lies entirely within one of the seller's windows for that day. */
function isSlotWithinSellerAvailability(
  dayOfWeek: number,
  slotStart: string,
  slotEnd: string,
  sellerSlots: SellerAvailabilitySlot[]
): boolean {
  const slotStartMin = timeToMinutes(slotStart);
  const slotEndMin = timeToMinutes(slotEnd);
  const dayWindows = sellerSlots.filter((s) => s.dayOfWeek === dayOfWeek);
  for (const w of dayWindows) {
    const wStart = timeToMinutes(w.start);
    const wEnd = timeToMinutes(w.end);
    if (slotStartMin >= wStart && slotEndMin <= wEnd) return true;
  }
  return false;
}

function formatSlotLabel(start: string): string {
  const [h, m] = start.split(':').map(Number);
  if (h === 0) return `12:${m.toString().padStart(2, '0')} am`;
  if (h < 12) return `${h}:${m.toString().padStart(2, '0')} am`;
  if (h === 12) return `12:${m.toString().padStart(2, '0')} pm`;
  return `${h - 12}:${m.toString().padStart(2, '0')} pm`;
}

function getEndTime(start: string): string {
  const [h] = start.split(':').map(Number);
  const nextH = h + 1;
  return `${nextH.toString().padStart(2, '0')}:00`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (slots: PickupSlot[]) => void;
  minSlots?: number;
  /** When set, only time slots that fall within the seller's weekly availability are shown. */
  sellerAvailability?: SellerAvailabilitySlot[] | null;
};

export function PickupCalendarModal({ open, onClose, onConfirm, minSlots = MIN_SLOTS, sellerAvailability }: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set()); // keys: "YYYY-MM-DD HH:mm"

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prevMonthDays = firstDay;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthLength = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < prevMonthDays; i++) {
    const d = new Date(prevMonthYear, prevMonth, prevMonthLength - prevMonthDays + i + 1);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
    : null;

  /** Days of week (0–6) that have at least one seller availability window; used to grey out dates with no slots. */
  const sellerAvailableDays = useMemo(() => {
    if (!sellerAvailability?.length) return null;
    const set = new Set<number>();
    sellerAvailability.forEach((s) => set.add(s.dayOfWeek));
    return set;
  }, [sellerAvailability]);

  const toggleTimeSlot = (dateKey: string, start: string) => {
    const key = `${dateKey} ${start}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const slotsAsArray = useMemo((): PickupSlot[] => {
    const now = new Date();
    const minStartMs = now.getTime() + MIN_HOURS_FROM_NOW * 60 * 60 * 1000;
    const out: PickupSlot[] = [];
    selectedSlots.forEach((key) => {
      const [date, start] = key.split(' ');
      const [y, m, d] = date.split('-').map(Number);
      const [h, min] = start.split(':').map(Number);
      const slotStart = new Date(y, m - 1, d, h, min, 0, 0);
      if (slotStart.getTime() < minStartMs) return; // exclude past and within 4h from count and submit
      out.push({ date, start, end: getEndTime(start) });
    });
    return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  }, [selectedSlots]);

  const canSubmit = slotsAsArray.length >= minSlots;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(slotsAsArray);
    onClose();
  };

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-relay-bg/70 dark:bg-relay-bg-dark/70 backdrop-blur-md">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto glass-card shadow-2xl">
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark mb-1 tracking-tighter text-center">
            Choose pickup times
          </h2>
          <p className="text-[10px] font-bold tracking-widest text-relay-muted text-center mb-6">
            Select at least {minSlots} time slot{minSlots === 1 ? '' : 's'} when you’re available
          </p>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="size-10 rounded-full border border-relay-border dark:border-relay-border-dark flex items-center justify-center text-relay-text dark:text-relay-text-dark hover:bg-relay-bg dark:hover:bg-relay-bg-dark"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <span className="text-sm font-bold tracking-widest text-relay-text dark:text-relay-text-dark">
              {monthName}, {year}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="size-10 rounded-full border border-relay-border dark:border-relay-border-dark flex items-center justify-center text-relay-text dark:text-relay-text-dark hover:bg-relay-bg dark:hover:bg-relay-bg-dark"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-[9px] font-bold tracking-widest text-relay-muted py-1">
                {d}
              </div>
            ))}
            {calendarDays.map(({ date, isCurrentMonth }, i) => {
              const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
              const isSelected = selectedDateKey === dateKey;
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
              const isPast = date < todayStart;
              const dayOfWeek = date.getDay();
              const hasNoSellerSlots = sellerAvailableDays !== null && !sellerAvailableDays.has(dayOfWeek);
              const isDisabled = isPast || (sellerAvailableDays !== null && hasNoSellerSlots);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isDisabled && setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
                  disabled={isDisabled}
                  className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                    !isCurrentMonth ? 'text-relay-muted/50' : isDisabled ? 'text-relay-muted/40 cursor-not-allowed' : 'text-relay-text dark:text-relay-text-dark'
                  } ${isSelected ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-relay-surface dark:ring-offset-relay-surface-dark' : ''} ${
                    isToday && !isSelected && !isDisabled ? 'ring-2 ring-primary/50' : ''
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time slots for selected date — only show future slots when selected date is today; when sellerAvailability is set, only show slots inside seller's windows */}
          {selectedDateKey && (() => {
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const isSelectedToday = selectedDateKey === todayKey;
            const minStartMs = now.getTime() + MIN_HOURS_FROM_NOW * 60 * 60 * 1000;
            let availableTimeSlots = isSelectedToday
              ? TIME_SLOTS.filter((start) => {
                  const [h, min] = start.split(':').map(Number);
                  const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0, 0);
                  return slotStart.getTime() >= minStartMs;
                })
              : TIME_SLOTS;
            if (sellerAvailability && sellerAvailability.length > 0) {
              const [y, m, d] = selectedDateKey.split('-').map(Number);
              const dayOfWeek = new Date(y, m - 1, d).getDay();
              availableTimeSlots = availableTimeSlots.filter((start) =>
                isSlotWithinSellerAvailability(dayOfWeek, start, getEndTime(start), sellerAvailability)
              );
            }
            return (
              <div className="mt-6 pt-4 border-t border-relay-border dark:border-relay-border-dark">
                <p className="text-[10px] font-bold tracking-widest text-relay-muted mb-3">
                  {selectedDate && selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTimeSlots.map((start) => {
                    const key = `${selectedDateKey} ${start}`;
                    const isSelected = selectedSlots.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTimeSlot(selectedDateKey, start)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : 'bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark border border-relay-border dark:border-relay-border-dark'
                        }`}
                      >
                        {formatSlotLabel(start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <p className="text-[10px] text-relay-muted mt-4 text-center">
            {slotsAsArray.length} of {minSlots} minimum selected
          </p>
        </div>

        <div className="p-6 pt-2 space-y-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">event_available</span>
            Confirm pickup times
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 text-relay-muted text-xs font-bold tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
