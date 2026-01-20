'use client';

import { useEffect, useId, useRef } from 'react';

import { Button } from './button';

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return;
    }

    const dialogElement = dialogRef.current;

    previouslyFocusedElementRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const focusableSelectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(focusableSelectors),
    ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialogElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!currentElement || currentElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else if (!currentElement || currentElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-gray-200"
        tabIndex={-1}
      >
        <div className="p-6 rounded-t-xl bg-gradient-to-r from-red-500 to-red-600">
          <h2 id={titleId} className="text-2xl font-bold text-white">
            {title}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p id={descriptionId} className="text-gray-700 leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              variant="danger"
              isLoading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
