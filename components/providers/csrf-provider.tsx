'use client';

import React, { createContext, useContext } from 'react';

type CsrfContextValue = string | null;

const CsrfContext = createContext<CsrfContextValue>(null);

type CsrfProviderProps = {
  token: string;
  children: React.ReactNode;
};

export function CsrfProvider({ token, children }: CsrfProviderProps) {
  return <CsrfContext.Provider value={token}>{children}</CsrfContext.Provider>;
}

export function useCsrfToken(): string | null {
  return useContext(CsrfContext);
}

