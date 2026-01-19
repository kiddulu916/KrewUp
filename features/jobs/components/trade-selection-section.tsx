'use client';

import { Button, Select } from '@/components/ui';
import { TRADES, TRADE_SUBCATEGORIES } from '@/lib/constants';
import type { useTradeSelections } from '../hooks/use-trade-selections';

type TradeSelectionSectionProps = {
  tradeSelections: ReturnType<typeof useTradeSelections>;
  isLoading?: boolean;
  onTradeChange?: (trades: string[]) => void;
  onSubTradeRemove?: (trade: string, subTrade: string) => void;
};

export function TradeSelectionSection({
  tradeSelections,
  isLoading = false,
  onTradeChange,
  onSubTradeRemove,
}: TradeSelectionSectionProps) {
  const {
    tradeSelections: selections,
    addTradeSelection,
    removeTradeSelection,
    updateTrade,
    addSubTrade,
    updateSubTrade,
    removeSubTrade,
  } = tradeSelections;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Trades Needed <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-gray-500 mb-3">Select trades and specialties needed for this job</p>

      <div className="space-y-4">
        {selections.map((selection, tradeIndex) => (
          <div key={tradeIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            {/* Trade Selection */}
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <Select
                  label={`Trade ${tradeIndex + 1}`}
                  options={[
                    { value: '', label: 'Select a trade...' },
                    ...TRADES.map((trade) => ({ value: trade, label: trade })),
                  ]}
                  value={selection.trade}
                  onChange={(e) => updateTrade(tradeIndex, e.target.value, onTradeChange)}
                  required={tradeIndex === 0}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addTradeSelection}
                disabled={isLoading}
                className="mb-0.5"
              >
                + Trade
              </Button>
              {tradeIndex > 0 && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => removeTradeSelection(tradeIndex)}
                  disabled={isLoading}
                  className="mb-0.5"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Sub-Trades for this trade */}
            {selection.trade && TRADE_SUBCATEGORIES[selection.trade] && (
              <div className="ml-4 space-y-2 border-l-2 border-krewup-blue pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-gray-600">Specialties</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSubTrade(tradeIndex)}
                    disabled={isLoading}
                  >
                    + Specialty
                  </Button>
                </div>

                {selection.subTrades.map((subTrade, subTradeIndex) => (
                  <div key={subTradeIndex} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        label=""
                        options={[
                          { value: '', label: 'Select specialty...' },
                          ...TRADE_SUBCATEGORIES[selection.trade].map((st) => ({
                            value: st,
                            label: st,
                          })),
                        ]}
                        value={subTrade}
                        onChange={(e) => updateSubTrade(tradeIndex, subTradeIndex, e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const trade = selection.trade;
                        const subTrade = selection.subTrades[subTradeIndex];
                        removeSubTrade(tradeIndex, subTradeIndex);
                        // Clean up rate for this sub-trade if callback provided
                        if (onSubTradeRemove && trade && subTrade) {
                          onSubTradeRemove(trade, subTrade);
                        }
                      }}
                      disabled={isLoading}
                    >
                      ×
                    </Button>
                  </div>
                ))}

                {selection.subTrades.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No specialties added yet</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
