"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";

type FormValue = FormDataEntryValue | null;

export function useUnsavedChanges(formRef: RefObject<HTMLFormElement | null>) {
  const [isDirty, setIsDirty] = useState(false);
  const originalValuesRef = useRef<Record<string, FormValue>>({});
  const isInitialized = useRef(false);

  // Helper to get form values
  const getFormValues = useCallback(() => {
    const form = formRef.current;
    if (!form) return {};

    const formData = new FormData(form);
    const values: Record<string, FormValue> = {};
    formData.forEach((value, key) => {
      values[key] = value;
    });
    return values;
  }, [formRef]);

  // Capture initial form values
  const captureOriginalValues = useCallback(() => {
    originalValuesRef.current = getFormValues();
    setIsDirty(false);
  }, [getFormValues]);

  // Capture on mount
  useEffect(() => {
    if (isInitialized.current) return;

    const form = formRef.current;
    if (!form) return;

    isInitialized.current = true;
    originalValuesRef.current = getFormValues();
  }, [formRef, getFormValues]);

  // Check if form is dirty
  const checkDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return false;

    const currentValues = getFormValues();
    const originalValues = originalValuesRef.current;
    let dirty = false;

    // Check all current values against original
    for (const key of Object.keys(currentValues)) {
      if (String(currentValues[key]) !== String(originalValues[key] ?? "")) {
        dirty = true;
        break;
      }
    }

    // Also check if any original keys are missing (field removed)
    if (!dirty) {
      for (const key of Object.keys(originalValues)) {
        if (!(key in currentValues)) {
          dirty = true;
          break;
        }
      }
    }

    setIsDirty(dirty);
    return dirty;
  }, [formRef, getFormValues]);

  // Reset dirty state (call after successful save)
  const resetDirty = useCallback(() => {
    captureOriginalValues();
  }, [captureOriginalValues]);

  // Mark as dirty manually (for non-form changes like photo uploads)
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    isDirty,
    checkDirty,
    resetDirty,
    markDirty,
    captureOriginalValues,
  };
}
