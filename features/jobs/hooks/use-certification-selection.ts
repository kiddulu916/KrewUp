import { useState, useMemo } from 'react';
import { CERTIFICATION_CATEGORIES, TRADE_TO_CERT_CATEGORY } from '@/lib/constants/certifications';

export function useCertificationSelection(
  selectedTrades: string[],
  initialSelectedCerts: string[] = []
) {
  const [selectedCerts, setSelectedCerts] = useState<string[]>(initialSelectedCerts);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Safety']) // Default "Safety" expanded
  );

  // Get relevant certification categories based on selected trades
  const relevantCertCategories = useMemo(() => {
    if (selectedTrades.length === 0) {
      // No trades selected, show all categories
      return Object.entries(CERTIFICATION_CATEGORIES);
    }

    // Filter to relevant categories based on selected trades
    const relevant = Object.entries(CERTIFICATION_CATEGORIES).filter(([category]) =>
      selectedTrades.some(trade => TRADE_TO_CERT_CATEGORY[trade] === category)
    );

    // Always include Safety if not already present
    const hasSafety = relevant.some(([cat]) => cat === 'Safety');
    if (!hasSafety) {
      const safetyEntry = ['Safety', CERTIFICATION_CATEGORIES['Safety']] as const;
      relevant.unshift(safetyEntry as any);
    }

    return relevant;
  }, [selectedTrades]);

  function toggleCert(cert: string) {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  }

  function toggleCategory(category: string) {
    const updated = new Set(expandedCategories);
    if (updated.has(category)) {
      updated.delete(category);
    } else {
      updated.add(category);
    }
    setExpandedCategories(updated);
  }

  // Filter out invalid certifications when trades change
  function filterInvalidCerts(selectedTrades: string[]) {
    if (selectedTrades.length === 0) {
      return; // Keep all if no trades selected
    }

    // Get relevant certification categories for selected trades
    const relevantCategories = Object.entries(CERTIFICATION_CATEGORIES).filter(([category]) =>
      selectedTrades.some(t => TRADE_TO_CERT_CATEGORY[t] === category) ||
      category === 'Safety' // Always include Safety
    );
    const validCerts = relevantCategories.flatMap(([_, certs]) => [...certs]) as string[];

    // Filter selected certs to only keep valid ones
    setSelectedCerts(prev => prev.filter(cert => validCerts.includes(cert as any)));
  }

  return {
    selectedCerts,
    expandedCategories,
    relevantCertCategories,
    toggleCert,
    toggleCategory,
    filterInvalidCerts,
  };
}
