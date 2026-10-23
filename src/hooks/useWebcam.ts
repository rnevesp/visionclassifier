import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type WebcamStatus = 'idle' | 'starting' | 'active' | 'denied' | 'unavailable' | 'error';

export interface UseWebcam {
  status: WebcamStatus;
  error?: string;
  start: () => Promise<void>;
  stop: () => void;
}

function classifyFailure(error: unknown): { status: WebcamStatus; error: string } {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { status: 'denied', error: 'Camera access was blocked. Allow it in the browser address bar and try again.' };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
    return { status: 'unavailable', error: 'No camera was found on this device.' };
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return { status: 'error', error: 'The camera is in use by another application.' };
  }
  return { status: 'error', error: error instanceof Error ? error.message : 'Could not start the camera.' };
}

/**
 * Attaches a camera stream to the given video element on demand and releases
 * it on stop or unmount. Permission and hardware failures become statuses the
 * UI can explain instead of exceptions.
 */
export function useWebcam(videoRef: RefObject<HTMLVideoElement | null>): UseWebcam {
  const [status, setStatus] = useState<WebcamStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(0);

  const stop = useCallback(() => {
    startingRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setError(undefined);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setError('This browser does not support camera access.');
      return;
    }
    stop();
    const ticket = startingRef.current;
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (ticket !== startingRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('active');
    } catch (err) {
      if (ticket !== startingRef.current) return;
      const result = classifyFailure(err);
      console.error('Webcam start failed', err);
      setStatus(result.status);
      setError(result.error);
    }
  }, [stop, videoRef]);

  useEffect(() => stop, [stop]);

  return { status, error, start, stop };
}
