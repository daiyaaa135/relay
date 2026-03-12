'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getDeviceCaptureConfig,
  getCaptureStepLabelForOverlay,
  type DeviceType,
  type CaptureStep,
} from '@/lib/DeviceCaptureConfig';
import { CameraOverlay } from './CameraOverlay';
import { createClient } from '@/lib/supabase';

const isNative = () => typeof window !== 'undefined' && Capacitor.isNativePlatform();

/** Convert a data URL from Camera plugin to a Blob for upload */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header?.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const LISTING_IMAGES_BUCKET = 'listing-images';

export type DeviceCaptureFlowProps = {
  deviceType: DeviceType;
  userId: string;
  onComplete: (photoUrls: string[]) => void;
  onCancel: () => void;
};

/**
 * Step-based device capture flow: live camera + overlay with bounding box,
 * one step per required dimension (front, back, left, right, etc.).
 * Prevents completion until all required steps are captured.
 */
export function DeviceCaptureFlow({
  deviceType,
  userId,
  onComplete,
  onCancel,
}: DeviceCaptureFlowProps) {
  const config = getDeviceCaptureConfig(deviceType);
  const requiredSteps = config.requiredSteps;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStep: CaptureStep | null =
    currentStepIndex < requiredSteps.length ? requiredSteps[currentStepIndex]! : null;
  const allRequiredStepsComplete = currentStepIndex >= requiredSteps.length;

  const streamRef = useRef<MediaStream | null>(null);

  // Start camera when mounted (web only; native uses Capacitor Camera plugin)
  useEffect(() => {
    if (isNative()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      return;
    }
    let s: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        s = mediaStream;
        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        setCameraError(
          err?.message?.includes('Permission')
            ? 'Camera access was denied. Allow camera in settings.'
            : 'Could not open camera. Try again.'
        );
      });
    return () => {
      if (s) s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    onCancel();
  };

  const supabase = createClient();
  const doUploadFromBlob = async (blob: Blob) => {
    if (!currentStep || !userId) return;
    const path = `${userId}/${currentStep}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);
    const newUrls = [...photoUrls, data.publicUrl];
    setPhotoUrls(newUrls);
    setCurrentStepIndex((i) => i + 1);
    if (newUrls.length >= requiredSteps.length) {
      onComplete(newUrls);
    }
  };

  /** Native (Capacitor): open camera or photo library and upload the chosen image */
  const captureWithNativeCamera = async (source: 'CAMERA' | 'PHOTOS') => {
    if (!currentStep || !userId) return;
    setUploading(true);
    setCameraError(null);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        source: source === 'CAMERA' ? CameraSource.Camera : CameraSource.Photos,
        quality: 90,
        resultType: CameraResultType.DataUrl,
        allowEditing: false,
      });
      const dataUrl = photo.dataUrl;
      if (!dataUrl) throw new Error('No image data returned');
      const blob = dataUrlToBlob(dataUrl);
      await doUploadFromBlob(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg?.toLowerCase().includes('cancel') || msg?.toLowerCase().includes('cancelled')) {
        // User cancelled picker – no error message
        return;
      }
      setCameraError(msg || 'Could not get photo. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const capturePhoto = async () => {
    if (!userId || !currentStep) return;
    const video = videoRef.current;

    if (isNative()) {
      await captureWithNativeCamera('CAMERA');
      return;
    }

    if (!video || !video.videoWidth) return;
    setUploading(true);
    setCameraError(null);
    const path = `${userId}/${currentStep}-${Date.now()}.jpg`;

    const doUpload = async (blob: Blob) => {
      const { error } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);
      const newUrls = [...photoUrls, data.publicUrl];
      setPhotoUrls(newUrls);
      setCurrentStepIndex((i) => i + 1);
      if (newUrls.length >= requiredSteps.length) {
        onComplete(newUrls);
      }
    };

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      if (!blob) throw new Error('Failed to capture image');
      await doUpload(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isBucketMissing = /bucket not found|not found|does not exist/i.test(msg);
      if (isBucketMissing) {
        const { error: createErr } = await supabase.storage.createBucket(LISTING_IMAGES_BUCKET, { public: true });
        if (!createErr) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth!;
            canvas.height = video.videoHeight!;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.drawImage(video, 0, 0);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.9)
            );
            if (blob) await doUpload(blob);
            else setCameraError('Saving photo failed.');
          } catch (retryErr) {
            setCameraError('Bucket was created but upload failed. In Supabase Dashboard → Storage → listing-images, add policy: allow authenticated INSERT and public SELECT.');
          }
        } else {
          setCameraError('Bucket not found. In Supabase Dashboard: Storage → New bucket → name "listing-images" (Public). Or run SQL from supabase/migrations/20241104000000_storage_listing_images.sql');
        }
      } else {
        setCameraError(msg || 'Saving photo failed.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (cameraError && !stream && !isNative()) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-relay-bg-dark justify-center items-center p-6">
        <p className="text-relay-text-dark text-sm text-center mb-2">{cameraError}</p>
        {photoUrls.length > 0 && (
          <p className="text-white/80 text-xs mb-4">
            {photoUrls.length} of {requiredSteps.length} photos
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={closeCamera}
            className="px-8 rounded-xl bg-relay-bg dark:bg-relay-bg-dark text-relay-text dark:text-relay-text-dark font-bold text-xs tracking-widest border border-relay-border dark:border-relay-border-dark"
            style={{ height: '42px' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Native: no live stream; use Capacitor Camera + photo library
  if (isNative()) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-relay-bg-dark">
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
          <button
            type="button"
            onClick={closeCamera}
            className="size-12 rounded-full bg-relay-bg-dark/70 text-relay-text-dark flex items-center justify-center"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <span className="text-white text-[10px] font-bold tracking-widest capitalize">
            {deviceType.replace('_', ' ')}
          </span>
          <div className="w-12" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <p className="text-relay-text-dark text-sm font-bold tracking-widest text-center">
            {currentStep ? getCaptureStepLabelForOverlay(currentStep) : 'Done'}
          </p>
          <p className="text-relay-text-dark/80 text-sm text-center">
            Step {currentStepIndex + 1} of {requiredSteps.length}
          </p>
          {cameraError && <p className="text-relay-text-dark/80 text-sm text-center">{cameraError}</p>}
          {allRequiredStepsComplete ? (
            <p className="text-white/90 text-center text-sm font-medium">All required photos captured. Closing…</p>
          ) : (
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={() => captureWithNativeCamera('CAMERA')}
                disabled={uploading}
                className="w-full rounded-xl bg-primary text-white font-bold text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ height: '42px' }}
              >
                {uploading ? (
                  <span className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined !text-2xl">camera</span>
                    Take photo
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-relay-bg-dark">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
        <button
          type="button"
          onClick={closeCamera}
          className="size-12 rounded-full bg-relay-bg-dark/70 text-relay-text-dark flex items-center justify-center"
          aria-label="Close camera"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <span className="text-white text-[10px] font-bold tracking-widest capitalize">
          {deviceType.replace('_', ' ')}
        </span>
        <div className="w-12" />
      </div>

      {/* Live camera feed - fully visible */}
      <div className="flex-1 relative min-h-0 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay: bounding box + step label */}
        {currentStep && (
          <CameraOverlay
            stepLabel={getCaptureStepLabelForOverlay(currentStep)}
            boundingBoxWidthPercent={config.boundingBoxWidthPercent}
            boundingBoxHeightPercent={config.boundingBoxHeightPercent}
            stepIndex={currentStepIndex}
            stepTotal={requiredSteps.length}
          />
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-relay-bg-dark/80">
            <p className="text-relay-text-dark text-sm text-center">{cameraError}</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-6 pb-10 bg-gradient-to-t from-relay-bg-dark to-transparent flex flex-col gap-4">
        {allRequiredStepsComplete ? (
          <p className="text-white/90 text-center text-sm font-medium">
            All required photos captured. Closing…
          </p>
        ) : (
          <button
            type="button"
            onClick={capturePhoto}
            disabled={uploading}
            className="w-full rounded-xl bg-primary text-white font-bold text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ height: '42px' }}
          >
            {uploading ? (
              <span className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined !text-2xl">camera</span>
                {currentStep ? `Capture ${currentStep}` : 'Capture'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
