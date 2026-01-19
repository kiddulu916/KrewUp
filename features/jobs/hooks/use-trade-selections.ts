import { useState, useMemo } from 'react';
import { TRADE_SUBCATEGORIES } from '@/lib/constants';
import { CERTIFICATION_CATEGORIES, TRADE_TO_CERT_CATEGORY } from '@/lib/constants/certifications';
import type { TradeSelection } from '../actions/job-actions';

export function useTradeSelections(
  initialSelections: Array<{ trade: string; subTrades: string[] }> = [{ trade: '', subTrades: [] }]
) {
  const [tradeSelections, setTradeSelections] = useState<Array<{ trade: string; subTrades: string[] }>>(
    initialSelections
  );

  // Calculate all selected sub-trades
  const allSubTrades = useMemo(
    () =>
      tradeSelections.flatMap(ts =>
        ts.subTrades.filter(st => st !== '').map(st => ({
          trade: ts.trade,
          subTrade: st,
        }))
      ),
    [tradeSelections]
  );

  // Show per-subtrade rates if 2+ sub-trades selected
  const showPerSubTradeRates = allSubTrades.length >= 2;

  // Get selected trades (non-empty)
  const selectedTrades = useMemo(
    () => tradeSelections.filter(ts => ts.trade !== '').map(ts => ts.trade),
    [tradeSelections]
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

  // Add a new trade selection
  function addTradeSelection() {
    setTradeSelections([...tradeSelections, { trade: '', subTrades: [] }]);
  }

  // Remove a trade selection
  function removeTradeSelection(index: number) {
    setTradeSelections(tradeSelections.filter((_, i) => i !== index));
  }

  // Update trade for a specific selection
  function updateTrade(index: number, trade: string, onTradeChange?: (trades: string[]) => void) {
    const updated = [...tradeSelections];
    updated[index] = { trade, subTrades: [] }; // Reset sub-trades when trade changes
    setTradeSelections(updated);

    // Callback to notify parent of trade changes (for certification filtering)
    if (onTradeChange) {
      const newSelectedTrades = updated.filter(ts => ts.trade !== '').map(ts => ts.trade);
      onTradeChange(newSelectedTrades);
    }
  }

  // Add a sub-trade to a specific trade selection
  function addSubTrade(index: number) {
    const updated = [...tradeSelections];
    updated[index].subTrades.push('');
    setTradeSelections(updated);
  }

  // Update a specific sub-trade
  function updateSubTrade(tradeIndex: number, subTradeIndex: number, subTrade: string) {
    const updated = [...tradeSelections];
    updated[tradeIndex].subTrades[subTradeIndex] = subTrade;
    setTradeSelections(updated);
  }

  // Remove a specific sub-trade
  function removeSubTrade(tradeIndex: number, subTradeIndex: number) {
    const updated = [...tradeSelections];
    updated[tradeIndex].subTrades = updated[tradeIndex].subTrades.filter((_, i) => i !== subTradeIndex);
    setTradeSelections(updated);
  }

  // Get valid trade selections (non-empty trades)
  function getValidTradeSelections(): TradeSelection[] {
    return tradeSelections
      .filter(ts => ts.trade !== '')
      .map(ts => ({
        trade: ts.trade,
        subTrades: ts.subTrades.filter(st => st !== ''),
      }));
  }

  return {
    tradeSelections,
    allSubTrades,
    showPerSubTradeRates,
    selectedTrades,
    relevantCertCategories,
    addTradeSelection,
    removeTradeSelection,
    updateTrade,
    addSubTrade,
    updateSubTrade,
    removeSubTrade,
    getValidTradeSelections,
  };
}
