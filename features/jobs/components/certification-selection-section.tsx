'use client';

import type { useCertificationSelection } from '../hooks/use-certification-selection';

type CertificationSelectionSectionProps = {
  certificationSelection: ReturnType<typeof useCertificationSelection>;
  selectedTrades: string[];
  isLoading?: boolean;
};

export function CertificationSelectionSection({
  certificationSelection,
  selectedTrades,
  isLoading = false,
}: CertificationSelectionSectionProps) {
  const { selectedCerts, expandedCategories, relevantCertCategories, toggleCert, toggleCategory } =
    certificationSelection;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Required Certifications (Optional)
      </label>
      <p className="text-xs text-gray-500 mb-4">
        {selectedTrades.length === 0
          ? 'Select trades above to filter relevant certifications'
          : 'Categories filtered based on selected trades. Safety is always shown.'}
      </p>

      <div className="space-y-2">
        {relevantCertCategories.map(([category, certs]) => (
          <div key={category} className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Category Header - Clickable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="font-medium text-gray-900">{category}</span>
              <span className="text-gray-600 text-lg">
                {expandedCategories.has(category) ? '▼' : '▶'}
              </span>
            </button>

            {/* Certifications Grid - Shown when expanded */}
            {expandedCategories.has(category) && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-white border-t border-gray-200">
                {certs.map((cert) => (
                  <label
                    key={cert}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCerts.includes(cert)}
                      onChange={() => toggleCert(cert)}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
                    />
                    <span className="text-sm text-gray-700">{cert}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show selected certifications count */}
      {selectedCerts.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{selectedCerts.length}</strong> certification{selectedCerts.length !== 1 ? 's' : ''}{' '}
            selected
          </p>
        </div>
      )}
    </div>
  );
}
