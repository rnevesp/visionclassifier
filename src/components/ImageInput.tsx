import { UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { MAX_IMAGE_BYTES, validateImageFile } from '@/lib/imageFile';

interface ImageInputProps {
  /** Called once the image element has decoded and is ready for prediction. */
  onImage: (image: HTMLImageElement) => void;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Upload, drag-drop and clipboard paste for a single image. Uses object URLs
 * instead of data URLs and revokes them when replaced.
 */
export default function ImageInput({ onImage, onClear, disabled }: ImageInputProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((file: File) => {
    const check = validateImageFile(file);
    if (!check.ok) {
      setFileError(check.error);
      return;
    }
    setFileError(undefined);
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const clear = useCallback(() => {
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileError(undefined);
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  }, [onClear]);

  useEffect(() => {
    return () => {
      // Release the last object URL on unmount.
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  // Clipboard paste anywhere on the page while this input is mounted.
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        accept(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [accept, disabled]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) accept(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) accept(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!dragging) setDragging(true);
  };

  const limitMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

  return (
    <div className="flex flex-col gap-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-3xl border-2 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors md:aspect-auto md:h-[400px] ${
          src ? 'border-transparent' : dragging ? 'border-accent bg-accent/5' : 'border-dashed border-gray-200'
        }`}
      >
        {src ? (
          <>
            <img
              src={src}
              alt="Image to classify"
              className="h-full w-full object-contain"
              onLoad={(e) => onImage(e.currentTarget)}
              onError={() => setFileError('The browser could not decode this image.')}
            />
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-gray-900 shadow-md ring-1 ring-black/5 backdrop-blur transition hover:bg-white"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-full w-full flex-col items-center justify-center p-8 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed"
          >
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <UploadCloud strokeWidth={1.5} size={32} aria-hidden />
            </span>
            <span className="mb-1 text-lg font-medium text-gray-900">Upload an image</span>
            <span className="mb-4 text-sm text-gray-500">Drag and drop, click to browse, or paste from the clipboard</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
              JPG, PNG, GIF, WebP up to {limitMb} MB
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
          disabled={disabled}
          aria-label="Choose an image file"
        />
      </div>
      {fileError && (
        <p role="alert" className="text-sm text-red-600">
          {fileError}
        </p>
      )}
    </div>
  );
}
