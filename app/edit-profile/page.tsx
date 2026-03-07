'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profiles';
import { getDefaultAvatar } from '@/lib/avatars';

/** Format 10-digit US number as +1 (XXX) XXX-XXXX */
function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '').slice(-10);
  if (d.length < 10) return phone || '';
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const AVATARS_BUCKET = 'avatars';
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file (e.g. JPG, PNG).');
      e.target.value = '';
      return;
    }
    setAvatarError(null);
    setUploadingAvatar(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const doUpload = async () => {
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      setProfilePic(data.publicUrl);
    };

    try {
      await doUpload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isBucketMissing = /bucket not found|not found|does not exist/i.test(msg);
      if (isBucketMissing) {
        const { error: createErr } = await supabase.storage.createBucket(AVATARS_BUCKET, { public: true });
        if (!createErr) {
          try {
            await doUpload();
          } catch (retryErr) {
            setAvatarError(retryErr instanceof Error ? retryErr.message : 'Upload failed after creating bucket. Add Storage policies (see Supabase docs).');
          }
        } else {
          setAvatarError('BUCKET NOT FOUND: Create the "avatars" bucket in Supabase. In Dashboard → SQL Editor run the migration: supabase/migrations/20241105000000_storage_avatars.sql — or create bucket "avatars" (Public) in Storage and add policies for SELECT and INSERT.');
        }
      } else {
        setAvatarError(msg || 'Upload failed. Try again.');
      }
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail((user as { email?: string }).email ?? '');
      setPhone((user as { phone?: string }).phone ?? '');
      const profile = await fetchProfile(user.id);
      if (cancelled) return;
      if (profile) {
        setName(profile.display_name);
        setBio(profile.bio ?? '');
        setProfilePic(profile.avatar_url ?? getDefaultAvatar(user.id));
      } else {
        setName(user.email?.split('@')[0] ?? 'User');
        setProfilePic(getDefaultAvatar(user.id));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-relay-surface dark:bg-relay-surface-dark">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center bg-relay-surface dark:bg-relay-surface-dark px-6">
        <div className="text-center">
          <p className="text-relay-muted text-sm mb-4">Sign in to edit your profile.</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
          className="next-step-button h-8 px-10 text-white text-xs font-semibold tracking-widest rounded-2xl"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-relay-surface dark:bg-relay-surface-dark transition-colors">
      <header className="shrink-0 px-6 pb-6 flex items-center justify-between bg-transparent z-30" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark hover:text-primary transition-colors active-scale"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-serif  text-relay-text dark:text-relay-text-dark tracking-tighter">Personal Info</h1>
        </div>
      </header>
      <div className="page-scroll" style={{ marginTop: '-1px' }}>
      <div className="px-6 py-10 pb-20 flex flex-col items-center">
        {error && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-relay-bg dark:bg-relay-bg-dark border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark text-sm text-center">
            {error}
          </div>
        )}
        <div className="mb-12">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
            disabled={uploadingAvatar}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group cursor-pointer disabled:opacity-70 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <div className="size-32 rounded-full overflow-hidden border-2 border-primary/20 p-1 relative">
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover rounded-full grayscale-[20%] group-hover:grayscale-0 transition-all" />
              <div className="absolute inset-0 bg-relay-bg-dark/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <span className="size-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                )}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary text-white flex items-center justify-center rounded-full border-4 border-relay-surface dark:border-relay-surface-dark shadow-lg">
              <span className="material-symbols-outlined !text-[16px]">edit</span>
            </div>
          </button>
          <p className="text-[10px] text-relay-muted text-center mt-2 tracking-widest">Tap to upload a photo</p>
          {avatarError && (
            <p className="text-[10px] text-relay-text dark:text-relay-text-dark/80 text-center mt-2" role="alert">
              {avatarError}
            </p>
          )}
        </div>

        <div className="w-full space-y-10">
          {/* Profile fields list (Name, Bio, Phone, Email) — tap row or chevron to edit */}
          <div className="w-full rounded-2xl border border-relay-border dark:border-relay-border-dark overflow-hidden bg-relay-bg dark:bg-relay-bg-dark">
            <button
              type="button"
              onClick={() => router.push('/edit-profile/name')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left border-b border-relay-border dark:border-relay-border-dark active:opacity-80"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-relay-text dark:text-relay-text-dark">Name</p>
                <p className="text-sm text-relay-muted mt-0.5 truncate">{name || 'Your name'}</p>
              </div>
              <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-2xl shrink-0 ml-2" aria-hidden>chevron_right</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/edit-profile/bio')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left border-b border-relay-border dark:border-relay-border-dark active:opacity-80"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-relay-text dark:text-relay-text-dark">Bio</p>
                <p className="text-sm text-relay-muted mt-0.5">{bio || 'Add a short bio'}</p>
              </div>
              <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-2xl shrink-0 ml-2" aria-hidden>chevron_right</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/edit-profile/phone')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left border-b border-relay-border dark:border-relay-border-dark active:opacity-80"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-relay-text dark:text-relay-text-dark">Phone number</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-sm text-relay-muted truncate">{phone ? formatPhoneDisplay(phone) : 'Add phone number'}</p>
                  {phone ? (
                    <span className="size-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0" aria-label="Verified">
                      <span className="material-symbols-outlined text-white !text-[12px]">check</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-2xl shrink-0 ml-2 self-center" aria-hidden>chevron_right</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/edit-profile/email')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left active:opacity-80"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-relay-text dark:text-relay-text-dark">Email</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-sm text-relay-muted truncate">{email || 'Add email address'}</p>
                  {email ? (
                    <span className="size-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0" aria-label="Verified">
                      <span className="material-symbols-outlined text-white !text-[12px]">check</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="material-symbols-outlined text-relay-muted dark:text-relay-muted-light text-2xl shrink-0 ml-2 self-center" aria-hidden>chevron_right</span>
            </button>
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
