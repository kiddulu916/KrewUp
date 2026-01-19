import { useState, useEffect } from 'react';

type PayRateMode = 'hourly' | 'contract' | 'none';

export type PayRateState = {
  hourlyRate: string;
  payPeriod: 'weekly' | 'bi-weekly' | 'monthly';
  contractAmount: string;
  contractType: 'Per Contract' | 'Per Job';
  subTradeRates: Record<string, string>;
};

export type PayRateData = {
  pay_rate: string;
  subtrade_pay_rates?: Record<string, string> | null;
};

export function usePayRate(
  jobType: string,
  showPerSubTradeRates: boolean,
  allSubTrades: Array<{ trade: string; subTrade: string }>,
  onPayRateChange?: (payRate: string) => void
) {
  const [hourlyRate, setHourlyRate] = useState('');
  const [payPeriod, setPayPeriod] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [contractAmount, setContractAmount] = useState('');
  const [contractType, setContractType] = useState<'Per Contract' | 'Per Job'>('Per Contract');
  const [subTradeRates, setSubTradeRates] = useState<Record<string, string>>({});

  // Determine pay rate mode
  const isHourlyJob = ['Full-Time', 'Part-Time', 'Temporary'].includes(jobType);
  const isContractJob = ['Contract', '1099'].includes(jobType);
  const isTemporaryOrContract = ['Temporary', 'Contract', '1099'].includes(jobType);

  // Auto-update pay_rate when conditional fields change (only for single rate mode)
  useEffect(() => {
    // Skip auto-update when showing per-subtrade rates
    if (showPerSubTradeRates) {
      return;
    }

    if (isHourlyJob && hourlyRate) {
      // Format: "$25/hr (weekly)" or "$25/hr (bi-weekly)" etc.
      const formattedRate = `$${hourlyRate}/hr (${payPeriod})`;
      onPayRateChange?.(formattedRate);
    } else if (isContractJob && contractAmount) {
      // Format: "$5000/contract" or "$500/job"
      const suffix = contractType === 'Per Contract' ? '/contract' : '/job';
      const formattedRate = `$${contractAmount}${suffix}`;
      onPayRateChange?.(formattedRate);
    } else if (!jobType) {
      // Reset pay_rate if job type is not selected
      onPayRateChange?.('');
    }
  }, [hourlyRate, payPeriod, contractAmount, contractType, jobType, isHourlyJob, isContractJob, showPerSubTradeRates, onPayRateChange]);

  function updateSubTradeRate(trade: string, subTrade: string, rate: string) {
    const key = `${trade}|${subTrade}`;
    setSubTradeRates(prev => ({
      ...prev,
      [key]: rate,
    }));
  }

  function removeSubTradeRate(trade: string, subTrade: string) {
    const key = `${trade}|${subTrade}`;
    setSubTradeRates(prev => {
      const newRates = { ...prev };
      delete newRates[key];
      return newRates;
    });
  }

  function buildPayRateData(): PayRateData {
    if (showPerSubTradeRates) {
      // Validate all rates are filled
      const missingRates: string[] = [];
      allSubTrades.forEach(({ trade, subTrade }) => {
        const key = `${trade}|${subTrade}`;
        if (!subTradeRates[key] || subTradeRates[key].trim() === '') {
          missingRates.push(subTrade);
        }
      });

      if (missingRates.length > 0) {
        throw new Error(`Please enter pay rates for: ${missingRates.join(', ')}`);
      }

      // Build subtrade_pay_rates object with raw numbers
      const rates: Record<string, string> = {};
      allSubTrades.forEach(({ trade, subTrade }) => {
        const key = `${trade}|${subTrade}`;
        rates[key] = subTradeRates[key];
      });

      // Build formatted display string
      const suffix = isHourlyJob
        ? `/hr (${payPeriod})`
        : `/${contractType.toLowerCase().replace(' ', '')}`;

      const displayParts = allSubTrades.map(({ trade, subTrade }) => {
        const key = `${trade}|${subTrade}`;
        return `${subTrade}: $${subTradeRates[key]}${suffix}`;
      });

      return {
        pay_rate: displayParts.join(', '),
        subtrade_pay_rates: rates,
      };
    }

    // Single rate mode - already formatted in useEffect
    return {
      pay_rate: '', // Will be set by parent from state
      subtrade_pay_rates: null,
    };
  }

  return {
    hourlyRate,
    setHourlyRate,
    payPeriod,
    setPayPeriod,
    contractAmount,
    setContractAmount,
    contractType,
    setContractType,
    subTradeRates,
    updateSubTradeRate,
    removeSubTradeRate,
    isHourlyJob,
    isContractJob,
    isTemporaryOrContract,
    buildPayRateData,
  };
}
