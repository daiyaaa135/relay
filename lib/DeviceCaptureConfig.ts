/**
 * Device capture configuration: required steps per device type,
 * camera aspect ratio, and bounding box dimensions for the overlay.
 * Bounding box values are percentages of the viewport (0–100).
 */

export type DeviceType = 'phone' | 'laptop' | 'tablet' | 'gaming_console' | 'video_game' | 'headphones' | 'speaker' | 'gaming_handheld';

export type CaptureStep =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export type DeviceCaptureConfig = {
  deviceType: DeviceType;
  /** Camera preview aspect ratio (width / height), e.g. 4/3 */
  cameraAspectRatio: number;
  /** Bounding box width as percentage of viewport (0–100) */
  boundingBoxWidthPercent: number;
  /** Bounding box height as percentage of viewport (0–100) */
  boundingBoxHeightPercent: number;
  /** Steps required for this device; order defines capture flow */
  requiredSteps: CaptureStep[];
  /** Optional steps (e.g. top, bottom); can be skipped or included */
  optionalSteps: CaptureStep[];
};

const DEFAULT_BOX_WIDTH = 75;
const DEFAULT_BOX_HEIGHT = 55;
const DEFAULT_ASPECT = 4 / 3;

/** All required steps per device: front, back, left, right, top, bottom */
const ALL_REQUIRED_STEPS: CaptureStep[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export const DEVICE_CAPTURE_CONFIGS: Record<DeviceType, DeviceCaptureConfig> = {
  phone: {
    deviceType: 'phone',
    cameraAspectRatio: DEFAULT_ASPECT,
    boundingBoxWidthPercent: DEFAULT_BOX_WIDTH,
    boundingBoxHeightPercent: DEFAULT_BOX_HEIGHT,
    requiredSteps: [...ALL_REQUIRED_STEPS],
    optionalSteps: [],
  },
  laptop: {
    deviceType: 'laptop',
    cameraAspectRatio: 16 / 9,
    boundingBoxWidthPercent: 70,
    boundingBoxHeightPercent: 50,
    requiredSteps: [...ALL_REQUIRED_STEPS],
    optionalSteps: [],
  },
  tablet: {
    deviceType: 'tablet',
    cameraAspectRatio: DEFAULT_ASPECT,
    boundingBoxWidthPercent: 72,
    boundingBoxHeightPercent: 52,
    requiredSteps: [...ALL_REQUIRED_STEPS],
    optionalSteps: [],
  },
  gaming_console: {
    deviceType: 'gaming_console',
    cameraAspectRatio: 16 / 9,
    boundingBoxWidthPercent: 68,
    boundingBoxHeightPercent: 48,
    requiredSteps: [...ALL_REQUIRED_STEPS],
    optionalSteps: [],
  },
  /** Video Games: disc/cartridge — front and back only (2 photos). */
  video_game: {
    deviceType: 'video_game',
    cameraAspectRatio: 16 / 9,
    boundingBoxWidthPercent: 68,
    boundingBoxHeightPercent: 48,
    requiredSteps: ['front', 'back'],
    optionalSteps: [],
  },
  /** Headphones, Speaker, Gaming Handhelds: front, back, top (3 photos). */
  headphones: {
    deviceType: 'headphones',
    cameraAspectRatio: DEFAULT_ASPECT,
    boundingBoxWidthPercent: DEFAULT_BOX_WIDTH,
    boundingBoxHeightPercent: DEFAULT_BOX_HEIGHT,
    requiredSteps: ['front', 'back', 'top'],
    optionalSteps: [],
  },
  speaker: {
    deviceType: 'speaker',
    cameraAspectRatio: DEFAULT_ASPECT,
    boundingBoxWidthPercent: DEFAULT_BOX_WIDTH,
    boundingBoxHeightPercent: DEFAULT_BOX_HEIGHT,
    requiredSteps: ['front', 'back', 'top'],
    optionalSteps: [],
  },
  gaming_handheld: {
    deviceType: 'gaming_handheld',
    cameraAspectRatio: 16 / 9,
    boundingBoxWidthPercent: 68,
    boundingBoxHeightPercent: 48,
    requiredSteps: ['front', 'back', 'top'],
    optionalSteps: [],
  },
};

export function getDeviceCaptureConfig(deviceType: DeviceType): DeviceCaptureConfig {
  return DEVICE_CAPTURE_CONFIGS[deviceType];
}

export function getStepLabel(step: CaptureStep): string {
  const labels: Record<CaptureStep, string> = {
    front: 'Front',
    back: 'Back',
    left: 'Left side',
    right: 'Right side',
    top: 'Top',
    bottom: 'Bottom',
  };
  return labels[step] ?? step;
}

export function getCaptureStepLabelForOverlay(step: CaptureStep): string {
  return `Capture ${getStepLabel(step).toLowerCase()}`;
}
