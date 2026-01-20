'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { CustomQuestionsBuilder } from './custom-questions-builder';
import { TradeSelectionSection } from './trade-selection-section';
import { PayRateSection } from './pay-rate-section';
import { CertificationSelectionSection } from './certification-selection-section';
import { JobFormFields } from './job-form-fields';
import { createJob, type JobData } from '../actions/job-actions';
import { useAsyncAction } from '@/hooks/use-async-action';
import { useTradeSelections } from '../hooks/use-trade-selections';
import { usePayRate } from '../hooks/use-pay-rate';
import { useCertificationSelection } from '../hooks/use-certification-selection';
import { useCsrfToken } from '@/components/providers/csrf-provider';

export function JobForm() {
  const { execute, isLoading, error } = useAsyncAction({
    showToast: false, // Handle errors manually for better UX
  });
  const csrfToken = useCsrfToken();

  const [formData, setFormData] = useState<JobData>({
    title: '',
    trades: [],
    job_type: '',
    description: '',
    location: '',
    pay_rate: '',
    time_length: '',
  });

  const [customQuestions, setCustomQuestions] = useState<Array<{ question: string; required: boolean }>>([]);

  // Trade selections hook
  const tradeSelections = useTradeSelections();

  // Pay rate hook
  const payRate = usePayRate(
    formData.job_type,
    tradeSelections.showPerSubTradeRates,
    tradeSelections.allSubTrades,
    (payRate) => {
      setFormData((prev) => ({ ...prev, pay_rate: payRate }));
    }
  );

  // Certification selection hook
  const certificationSelection = useCertificationSelection(tradeSelections.selectedTrades);

  // Filter invalid certifications when trades change
  useEffect(() => {
    certificationSelection.filterInvalidCerts(tradeSelections.selectedTrades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeSelections.selectedTrades]);

  function updateFormData(updates: Partial<JobData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate at least one trade is selected
    const validTradeSelections = tradeSelections.getValidTradeSelections();
    if (validTradeSelections.length === 0) {
      execute(async () => {
        throw new Error('Please select at least one trade');
      });
      return;
    }

    await execute(async () => {
      // Build pay rate data based on mode
      let payRateData: { pay_rate: string; subtrade_pay_rates?: Record<string, string> | null } = {
        pay_rate: formData.pay_rate,
        subtrade_pay_rates: null,
      };

      if (tradeSelections.showPerSubTradeRates) {
        // Use hook's buildPayRateData method which handles validation
        payRateData = payRate.buildPayRateData();
      }

      const jobData: JobData = {
        ...formData,
        ...payRateData,
        trade_selections: validTradeSelections,
        required_certs: certificationSelection.selectedCerts.length > 0
          ? certificationSelection.selectedCerts
          : undefined,
        custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
        // Keep old fields for backward compatibility
        trade: validTradeSelections[0].trade,
        sub_trade: validTradeSelections[0].subTrades[0] || undefined,
      };

      const result = await createJob({
        ...jobData,
        csrfToken: csrfToken || '',
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to create job');
      }
      return result;
      // If successful, user will be redirected by the action
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <JobFormFields
        formData={formData}
        onFormDataChange={updateFormData}
        isTemporaryOrContract={payRate.isTemporaryOrContract}
        isLoading={isLoading}
      />

      <TradeSelectionSection
        tradeSelections={tradeSelections}
        isLoading={isLoading}
        onTradeChange={(trades) => {
          // Update formData.trades for backward compatibility
          setFormData((prev) => ({ ...prev, trades }));
        }}
        onSubTradeRemove={(trade, subTrade) => {
          payRate.removeSubTradeRate(trade, subTrade);
        }}
      />

      <PayRateSection
        payRate={payRate}
        jobType={formData.job_type}
        showPerSubTradeRates={tradeSelections.showPerSubTradeRates}
        tradeSelections={tradeSelections.tradeSelections}
        isLoading={isLoading}
      />

      <CertificationSelectionSection
        certificationSelection={certificationSelection}
        selectedTrades={tradeSelections.selectedTrades}
        isLoading={isLoading}
      />

      {/* Custom Screening Questions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Screening Questions</h3>
        <CustomQuestionsBuilder value={customQuestions} onChange={setCustomQuestions} />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Post Job
        </Button>
      </div>
    </form>
  );
}
