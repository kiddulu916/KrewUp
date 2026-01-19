'use client';

import { Input, Select } from '@/components/ui';
import type { usePayRate } from '../hooks/use-pay-rate';

type PayRateSectionProps = {
  payRate: ReturnType<typeof usePayRate>;
  jobType: string;
  showPerSubTradeRates: boolean;
  tradeSelections: Array<{ trade: string; subTrades: string[] }>;
  isLoading?: boolean;
};

export function PayRateSection({
  payRate,
  jobType,
  showPerSubTradeRates,
  tradeSelections,
  isLoading = false,
}: PayRateSectionProps) {
  const {
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
    isHourlyJob,
    isContractJob,
  } = payRate;

  // Show helper message if no job type selected
  if (!jobType) {
    return (
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          💡 Select a job type above to configure pay rate options
        </p>
      </div>
    );
  }

  // Per-Subtrade Pay Rates (when 2+ sub-trades)
  if (showPerSubTradeRates && isHourlyJob) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pay Rates by Specialty</h3>

        {/* Shared Pay Period */}
        <Select
          label="Pay Period (applies to all sub-trades)"
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'bi-weekly', label: 'Bi-Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          value={payPeriod}
          onChange={(e) => setPayPeriod(e.target.value as 'weekly' | 'bi-weekly' | 'monthly')}
          required
          disabled={isLoading}
        />

        {/* Grouped by Trade */}
        {tradeSelections
          .filter((ts) => ts.subTrades.some((st) => st !== ''))
          .map((ts) => (
            <div key={ts.trade} className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-3">{ts.trade}</h4>
              <div className="space-y-2">
                {ts.subTrades
                  .filter((st) => st !== '')
                  .map((st) => {
                    const key = `${ts.trade}|${st}`;
                    return (
                      <div key={st} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 min-w-[200px]">• {st}:</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-700">$</span>
                          <input
                            type="number"
                            value={subTradeRates[key] || ''}
                            onChange={(e) => updateSubTradeRate(ts.trade, st, e.target.value)}
                            placeholder="25"
                            required
                            disabled={isLoading}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue"
                          />
                          <span className="text-gray-700 text-sm">/hr</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (showPerSubTradeRates && isContractJob) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pay Rates by Specialty</h3>

        {/* Shared Contract Type */}
        <Select
          label="Payment Type (applies to all sub-trades)"
          options={[
            { value: 'Per Contract', label: 'Per Contract' },
            { value: 'Per Job', label: 'Per Job' },
          ]}
          value={contractType}
          onChange={(e) => setContractType(e.target.value as 'Per Contract' | 'Per Job')}
          required
          disabled={isLoading}
        />

        {/* Grouped by Trade */}
        {tradeSelections
          .filter((ts) => ts.subTrades.some((st) => st !== ''))
          .map((ts) => (
            <div key={ts.trade} className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-3">{ts.trade}</h4>
              <div className="space-y-2">
                {ts.subTrades
                  .filter((st) => st !== '')
                  .map((st) => {
                    const key = `${ts.trade}|${st}`;
                    return (
                      <div key={st} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 min-w-[200px]">• {st}:</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-700">$</span>
                          <input
                            type="number"
                            value={subTradeRates[key] || ''}
                            onChange={(e) => updateSubTradeRate(ts.trade, st, e.target.value)}
                            placeholder="5000"
                            required
                            disabled={isLoading}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue"
                          />
                          <span className="text-gray-700 text-sm">
                            /{contractType.toLowerCase().replace(' ', '')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    );
  }

  // Single Pay Rate (when 0-1 sub-trades)
  if (!showPerSubTradeRates && isHourlyJob) {
    const formattedRate = hourlyRate
      ? `$${hourlyRate}/hr (${payPeriod})`
      : '';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input
            label="Hourly Rate"
            type="number"
            placeholder="25"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            helperText="Enter rate without $ symbol"
            required
            disabled={isLoading}
          />

          <Select
            label="Pay Period"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi-weekly', label: 'Bi-Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value as 'weekly' | 'bi-weekly' | 'monthly')}
            required
            disabled={isLoading}
          />
        </div>

        {formattedRate && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">
              <strong>Pay Rate:</strong> {formattedRate}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!showPerSubTradeRates && isContractJob) {
    const formattedRate = contractAmount
      ? `$${contractAmount}${contractType === 'Per Contract' ? '/contract' : '/job'}`
      : '';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input
            label="Contract/Job Amount"
            type="number"
            placeholder="5000"
            value={contractAmount}
            onChange={(e) => setContractAmount(e.target.value)}
            helperText="Enter amount without $ symbol"
            required
            disabled={isLoading}
          />

          <Select
            label="Payment Type"
            options={[
              { value: 'Per Contract', label: 'Per Contract' },
              { value: 'Per Job', label: 'Per Job' },
            ]}
            value={contractType}
            onChange={(e) => setContractType(e.target.value as 'Per Contract' | 'Per Job')}
            required
            disabled={isLoading}
          />
        </div>

        {formattedRate && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">
              <strong>Pay Rate:</strong> {formattedRate}
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
