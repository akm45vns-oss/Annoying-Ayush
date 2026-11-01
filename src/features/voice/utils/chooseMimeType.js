/**
 * Selects the optimal supported audio MIME type for MediaRecorder recording
 * across modern mobile and desktop browsers (Android Chrome, iOS Safari, desktop browsers).
 */
export function chooseSupportedMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus'
  ];

  for (const type of preferredTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Continue to next type if browser throws on probe
    }
  }

  return '';
}

