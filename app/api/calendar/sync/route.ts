import { NextRequest } from 'next/server';
import { createAnonClient } from '@/lib/supabase-server';
import { refreshAccessToken } from '@/lib/googleCalendar';
import { EARLIEST_MINUTES, LATEST_MINUTES, type AvailabilitySlot } from '@/lib/availability';

type FreeBusyResponse = {
  calendars?: {
    primary?: {
      busy?: { start: string; end: string }[];
    };
  };
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let profileId: string;
  try {
    const anon = createAnonClient(token);
    const { data: { user }, error } = await anon.auth.getUser(token);
    if (error || !user?.id) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    profileId = user.id;
  } catch {
    return Response.json({ error: 'Auth failed' }, { status: 401 });
  }

  const tokenResult = await refreshAccessToken(profileId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not_connected') {
      return Response.json({ error: 'Calendar not connected' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to get access token' }, { status: 500 });
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const timeMax = new Date(now.getTime() + twoWeeksMs).toISOString();

  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenResult.accessToken}`,
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: 'primary' }],
    }),
  });

  if (!fbRes.ok) {
    return Response.json({ error: 'freebusy_failed' }, { status: 500 });
  }

  const fbData = (await fbRes.json()) as FreeBusyResponse;
  const busy = fbData.calendars?.primary?.busy ?? [];

  const busyByDay: Map<number, { start: number; end: number }[]> = new Map();
  for (const slot of busy) {
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;
    const dayOfWeek = startDate.getDay();
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    if (!busyByDay.has(dayOfWeek)) busyByDay.set(dayOfWeek, []);
    busyByDay.get(dayOfWeek)!.push({ start: startMinutes, end: endMinutes });
  }

  const slots: AvailabilitySlot[] = [];

  for (let day = 0; day < 7; day += 1) {
    const dayBusy = (busyByDay.get(day) ?? []).slice().sort((a, b) => a.start - b.start);
    let freeSegments: { start: number; end: number }[] = [
      { start: EARLIEST_MINUTES, end: LATEST_MINUTES },
    ];

    for (const b of dayBusy) {
      const nextSegments: { start: number; end: number }[] = [];
      for (const seg of freeSegments) {
        const overlapStart = Math.max(seg.start, b.start);
        const overlapEnd = Math.min(seg.end, b.end);
        if (overlapStart >= overlapEnd) {
          nextSegments.push(seg);
          continue;
        }
        if (b.start <= seg.start && b.end >= seg.end) {
          continue;
        }
        if (b.start <= seg.start && b.end < seg.end) {
          nextSegments.push({ start: b.end, end: seg.end });
        } else if (b.start > seg.start && b.end >= seg.end) {
          nextSegments.push({ start: seg.start, end: b.start });
        } else {
          nextSegments.push({ start: seg.start, end: b.start });
          nextSegments.push({ start: b.end, end: seg.end });
        }
      }
      freeSegments = nextSegments;
    }

    freeSegments.forEach((seg) => {
      if (seg.end - seg.start >= 30) {
        const startH = Math.floor(seg.start / 60);
        const startM = seg.start % 60;
        const endH = Math.floor(seg.end / 60);
        const endM = seg.end % 60;
        const start = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
        const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        slots.push({ dayOfWeek: day, start, end });
      }
    });
  }

  return Response.json({ slots });
}

