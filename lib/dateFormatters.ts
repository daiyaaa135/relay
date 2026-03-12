/** Format ISO date as "Joined February 2026" for profile join date. */
export function formatJoinedDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `Joined ${month} ${year}`;
}
