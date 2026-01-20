'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type SuspendUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration: number) => Promise<void>;
  isLoading?: boolean;
};

export function SuspendUserDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: SuspendUserDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);

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
        handleClose();
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

  const handleClose = () => {
    setSuspendReason('');
    setSuspendDuration(7);
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(suspendReason, suspendDuration);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-yellow-200"
        tabIndex={-1}
      >
        <div className="p-6 rounded-t-xl bg-gradient-to-r from-yellow-500 to-yellow-600">
          <h2 id={titleId} className="text-2xl font-bold text-white">
            Suspend User
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Duration (days)
            </label>
            <Input
              type="number"
              value={suspendDuration}
              onChange={(e) => setSuspendDuration(parseInt(e.target.value))}
              min={1}
              max={365}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <Input
              type="text"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="secondary"
              isLoading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              Confirm Suspension
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
