import { createClient } from './supabase';

export type AvailabilitySlot = {
  id?: string;
  /** 0 = Sunday, 6 = Saturday (matches JS Date.getDay) */
  dayOfWeek: number;
  /** 24h time, HH:MM (e.g. "09:30") */
  start: string;
  /** 24h time, HH:MM (e.g. "20:00") */
  end: string;
};

export const EARLIEST_MINUTES = 9 * 60 + 30; // 9:30 AM
export const LATEST_MINUTES = 20 * 60; // 8:00 PM
export const MIN_AVAILABLE_MINUTES = 6 * 60; // 6 hours total per week

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export function isSlotWithinBounds(slot: AvailabilitySlot): boolean {
  const startMin = timeToMinutes(slot.start);
  const endMin = timeToMinutes(slot.end);
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return false;
  if (startMin >= endMin) return false;
  return startMin >= EARLIEST_MINUTES && endMin <= LATEST_MINUTES;
}

export function computeTotalMinutes(slots: AvailabilitySlot[]): number {
  return slots.reduce((total, slot) => {
    const startMin = timeToMinutes(slot.start);
    const endMin = timeToMinutes(slot.end);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return total;
    if (endMin <= startMin) return total;
    return total + (endMin - startMin);
  }, 0);
}

export async function fetchAvailability(profileId: string): Promise<AvailabilitySlot[]> {
  if (!profileId) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profile_availability')
      .select('id, day_of_week, start_time, end_time')
      .eq('profile_id', profileId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      dayOfWeek: Number((row as { day_of_week: number }).day_of_week ?? 0),
      start: String((row as { start_time: string }).start_time).slice(0, 5),
      end: String((row as { end_time: string }).end_time).slice(0, 5),
    }));
  } catch {
    return [];
  }
}

export async function hasAvailability(profileId: string): Promise<boolean> {
  if (!profileId) return false;
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('profile_availability')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function saveAvailability(profileId: string, slots: AvailabilitySlot[]): Promise<{ error: string | null }> {
  if (!profileId) return { error: 'No profile' };

  // Filter and validate slots on the server side as a second line of defense.
  const validSlots = slots.filter((s) => isSlotWithinBounds(s));
  const totalMinutes = computeTotalMinutes(validSlots);
  if (totalMinutes < MIN_AVAILABLE_MINUTES) {
    return { error: 'Please add at least 6 hours across your week between 9:30 am and 8:00 pm.' };
  }

  try {
    const supabase = createClient();
    // Replace existing rows with the new set for this profile.
    await supabase.from('profile_availability').delete().eq('profile_id', profileId);
    if (validSlots.length === 0) return { error: 'No availability slots to save.' };
    const payload = validSlots.map((slot) => ({
      profile_id: profileId,
      day_of_week: slot.dayOfWeek,
      start_time: slot.start,
      end_time: slot.end,
    }));
    const { error } = await supabase.from('profile_availability').insert(payload);
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save availability' };
  }
}

