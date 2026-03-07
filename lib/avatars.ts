export const DEFAULT_AVATARS = [
  '/avatars/avatar1.png',
  '/avatars/avatar2.png',
  '/avatars/avatar3.png',
  '/avatars/avatar4.png',
  '/avatars/avatar5.png',
  '/avatars/avatar6.png',
] as const;

export type DefaultAvatar = (typeof DEFAULT_AVATARS)[number];

/** Deterministic default avatar based on a stable key (e.g. user id or name). */
export function getDefaultAvatar(key: string | null | undefined): DefaultAvatar {
  const safeKey = (key ?? '').trim();
  if (!safeKey) {
    return DEFAULT_AVATARS[0];
  }
  let hash = 0;
  for (let i = 0; i < safeKey.length; i += 1) {
    // Simple string hash; deterministic across sessions.
    hash = (hash * 31 + safeKey.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

