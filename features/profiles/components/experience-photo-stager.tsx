'use client';

import { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';

type StagedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  isCompressing: boolean;
};

type ExperiencePhotoStagerProps = {
  onPhotosChange: (files: File[]) => void;
  isPro: boolean;
  disabled?: boolean;
};

const MAX_FREE_PHOTOS = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ExperiencePhotoStager({ onPhotosChange, isPro, disabled }: ExperiencePhotoStagerProps) {
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const maxPhotos = isPro ? Infinity : MAX_FREE_PHOTOS;
  const canAddMore = stagedPhotos.length < maxPhotos && !disabled;
  const remaining = isPro ? null : MAX_FREE_PHOTOS - stagedPhotos.length;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload JPEG, PNG, or WebP images only');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 5MB');
      return;
    }

    // Check limit
    if (!isPro && stagedPhotos.length >= MAX_FREE_PHOTOS) {
      toast.warning('Free users can upload maximum 5 photos per project. Upgrade to Pro for unlimited.');
      return;
    }

    const tempId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    // Add with compressing state
    const newPhoto: StagedPhoto = { id: tempId, file, previewUrl, isCompressing: true };
    setStagedPhotos(prev => {
      const updated = [...prev, newPhoto];
      return updated;
    });

    try {
      // Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Update with compressed file
      setStagedPhotos(prev => {
        const updated = prev.map(p =>
          p.id === tempId ? { ...p, file: compressedFile, isCompressing: false } : p
        );
        onPhotosChange(updated.filter(p => !p.isCompressing).map(p => p.file));
        return updated;
      });
    } catch {
      // Remove failed photo
      setStagedPhotos(prev => {
        const updated = prev.filter(p => p.id !== tempId);
        onPhotosChange(updated.filter(p => !p.isCompressing).map(p => p.file));
        return updated;
      });
      URL.revokeObjectURL(previewUrl);
      toast.error('Failed to compress image');
    }
  }, [isPro, stagedPhotos.length, onPhotosChange, toast]);

  const handleRemove = useCallback((photoId: string) => {
    setStagedPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      const updated = prev.filter(p => p.id !== photoId);
      onPhotosChange(updated.filter(p => !p.isCompressing).map(p => p.file));
      return updated;
    });
  }, [onPhotosChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {isPro
            ? 'Add photos to showcase this project'
            : `Add photos of your work (max ${MAX_FREE_PHOTOS} for free)`}
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {stagedPhotos.map(photo => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="Staged project photo"
                className="w-full h-full object-cover"
              />

              {photo.isCompressing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-6 w-6 motion-safe:animate-spin motion-reduce:animate-none rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors shadow-md"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add Photo tile */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-krewup-blue hover:text-krewup-blue transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-medium">Add Photo</span>
            </button>
          )}

          {!canAddMore && !isPro && stagedPhotos.length >= MAX_FREE_PHOTOS && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2 text-center">
              <a href="/pricing" className="text-xs text-krewup-blue hover:underline font-medium">
                Upgrade to Pro for unlimited photos
              </a>
            </div>
          )}
        </div>

        {remaining !== null && remaining > 0 && stagedPhotos.length > 0 && (
          <p className="text-xs text-gray-500">{remaining} photo{remaining !== 1 ? 's' : ''} remaining</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select project photo"
        />
      </CardContent>
    </Card>
  );
}
