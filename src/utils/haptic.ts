/**
 * Haptic Vibration Utility for mobile touch feedback.
 * Triggers tactile vibration patterns during popup animations and verification unlocks.
 */
export const triggerHaptic = (pattern: number | number[] = 25) => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Browser safety fallback
    }
  }
};

export const HAPTIC_PATTERNS = {
  tap: 15,
  balloonClick: [25, 30, 25],
  popupOpen: [30, 40, 30],
  successUnlock: [40, 60, 80],
};
