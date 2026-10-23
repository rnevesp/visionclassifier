import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import ErrorCard from './ErrorCard';

interface WebcamInputProps {
  /** Called with the live video element on every sampled frame while running. */
  onFrame: (video: HTMLVideoElement) => void;
  /** Called when the camera starts or stops so the parent can track input state. */
  onActiveChange: (active: boolean) => void;
  disabled?: boolean;
  /** Frames per second to sample; the predictor drops frames while busy anyway. */
  fps?: number;
}

/**
 * Live camera input. Stop freezes the last frame onto a canvas so the final
 * prediction stays attached to something visible.
 */
export default function WebcamInput({ onFrame, onActiveChange, disabled, fps = 4 }: WebcamInputProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frozen, setFrozen] = useState(false);
  const { status, error, start, stop } = useWebcam(videoRef);
  const active = status === 'active';

  useEffect(() => {
    onActiveChange(active || frozen);
  }, [active, frozen, onActiveChange]);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    const id = window.setInterval(() => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) onFrame(video);
    }, Math.max(50, Math.round(1000 / fps)));
    return () => window.clearInterval(id);
  }, [active, fps, onFrame]);

  const handleStart = () => {
    setFrozen(false);
    void start();
  };

  const handleStop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setFrozen(true);
    }
    stop();
  };

  useEffect(() => {
    if (disabled && active) stop();
  }, [disabled, active, stop]);

  const starting = status === 'starting';
  const failed = status === 'denied' || status === 'unavailable' || status === 'error';

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:aspect-auto md:h-[400px]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-contain ${active ? '' : 'hidden'}`}
          aria-label="Live camera preview"
        />
        <canvas
          ref={canvasRef}
          className={`h-full w-full object-contain ${frozen && !active ? '' : 'hidden'}`}
          aria-label="Last captured frame"
        />
        {!active && !frozen && (
          <div className="flex flex-col items-center p-8 text-center text-gray-400">
            {starting ? (
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-white/80" aria-hidden />
            ) : (
              <Camera strokeWidth={1.25} size={48} className="mb-4 opacity-70" aria-hidden />
            )}
            <p className="text-sm">
              {starting ? 'Waiting for camera permission…' : 'The camera stays on this device. Nothing is uploaded.'}
            </p>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {active ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-gray-900 shadow-md backdrop-blur transition hover:bg-white"
            >
              <CameraOff className="h-4 w-4" aria-hidden /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={disabled || starting}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white shadow-md transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden /> {frozen ? 'Start again' : 'Start camera'}
            </button>
          )}
        </div>
      </div>
      {failed && error && (
        <ErrorCard
          title={status === 'denied' ? 'Camera access blocked' : status === 'unavailable' ? 'No camera available' : 'Camera error'}
          message={`${error} You can still classify uploaded images.`}
          compact
        />
      )}
    </div>
  );
}
