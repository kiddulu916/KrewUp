'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpeg,.jpg,.png,.webp,.pdf';

type Props = {
  value?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  error?: string;
};

/**
 * CredentialPhotoUpload Component
 *
 * A drag-and-drop file upload component for credential photos (certifications/licenses).
 * Supports JPEG, PNG, WebP images and PDF files up to 5MB.
 *
 * Features:
 * - Drag-and-drop upload
 * - File validation (type and size)
 * - Image preview or PDF icon display
 * - Remove button to clear selection
 * - Error state display
 */
export function CredentialPhotoUpload({ value, onChange, disabled = false, error }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if we're showing a value from props or a locally selected file
  const hasLocalFile = localFile !== null;

  // Compute display values based on whether we have a local file or prop value
  const displayPreviewUrl = hasLocalFile ? localPreviewUrl : value;
  const isPdf = useMemo(() => {
    if (hasLocalFile && localFile) {
      return localFile.type === 'application/pdf';
    }
    if (value) {
      return value.toLowerCase().endsWith('.pdf');
    }
    return false;
  }, [hasLocalFile, localFile, value]);

  const fileName = localFile?.name || null;
  const fileSize = localFile?.size || null;

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const validateFile = useCallback((file: File): string | null => {
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'Please select a valid file type (JPEG, PNG, WebP, or PDF)';
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 5MB';
    }

    return null;
  }, []);

  const processFile = useCallback(
    (file: File) => {
      setValidationError(null);

      const validationResult = validateFile(file);
      if (validationResult) {
        setValidationError(validationResult);
        return;
      }

      // Revoke previous blob URL if exists
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }

      const isPdfFile = file.type === 'application/pdf';
      setLocalFile(file);

      if (isPdfFile) {
        // For PDFs, we don't create a preview URL, just show the icon
        setLocalPreviewUrl(null);
        onChange(file, null);
      } else {
        // For images, create a preview URL
        const newPreviewUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(newPreviewUrl);
        onChange(file, newPreviewUrl);
      }
    },
    [localPreviewUrl, validateFile, onChange]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleRemove = useCallback(() => {
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalFile(null);
    setLocalPreviewUrl(null);
    setValidationError(null);
    onChange(null, null);
  }, [localPreviewUrl, onChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled]
  );

  const displayError = validationError || error;
  const hasFile = displayPreviewUrl || isPdf;

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        aria-label="Upload credential photo"
      />

      {hasFile ? (
        /* Preview state */
        <div className="space-y-3">
          <div className="relative">
            {isPdf ? (
              /* PDF preview */
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-10 h-10 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileName || 'PDF Document'}
                  </p>
                  {fileSize && (
                    <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Image preview */
              <div className="relative w-full h-64">
                <Image
                  src={displayPreviewUrl!}
                  alt="Credential preview"
                  fill
                  className="object-contain rounded-lg border border-gray-200"
                  unoptimized
                />
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
            disabled={disabled}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      ) : (
        /* Upload area */
        <div
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`
            flex flex-col items-center justify-center w-full h-32
            border-2 border-dashed rounded-lg cursor-pointer
            transition-colors
            ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
            ${isDragActive ? 'border-krewup-blue bg-blue-50' : 'border-gray-300 bg-gray-50'}
            ${displayError ? 'border-red-500 bg-red-50' : ''}
          `}
          aria-label="Click or drag and drop to upload credential photo"
          aria-describedby={displayError ? 'credential-upload-error' : undefined}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload
              className={`w-8 h-8 mb-3 ${
                isDragActive ? 'text-krewup-blue' : displayError ? 'text-red-400' : 'text-gray-400'
              }`}
            />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">JPEG, PNG, WebP, or PDF (Max 5MB)</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p id="credential-upload-error" className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
