'use client';

import { Input, Select } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common/location-autocomplete';
import { JOB_TYPES } from '@/lib/constants';
import type { JobData } from '../actions/job-actions';

type JobFormFieldsProps = {
  formData: JobData;
  onFormDataChange: (updates: Partial<JobData>) => void;
  isTemporaryOrContract: boolean;
  isLoading?: boolean;
};

export function JobFormFields({
  formData,
  onFormDataChange,
  isTemporaryOrContract,
  isLoading = false,
}: JobFormFieldsProps) {
  return (
    <>
      <Input
        label="Job Title"
        type="text"
        placeholder="e.g., Experienced Carpenter Needed"
        value={formData.title}
        onChange={(e) => onFormDataChange({ title: e.target.value })}
        required
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select
          label="Job Type"
          options={JOB_TYPES.map((type) => ({ value: type, label: type }))}
          value={formData.job_type}
          onChange={(e) => onFormDataChange({ job_type: e.target.value })}
          required
          disabled={isLoading}
        />

        <div>
          <LocationAutocomplete
            label="Location"
            value={formData.location}
            onChange={(data) => {
              onFormDataChange({
                location: data.address,
                coords: data.coords,
              });
            }}
            helperText="Start typing for address suggestions"
            required
            placeholder="City, State"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Description</label>
        <textarea
          className="flex min-h-[160px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe the job responsibilities, requirements, and any other relevant details..."
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      {/* Time Length for Temporary/Contract Jobs */}
      {isTemporaryOrContract && (
        <div>
          <Input
            label="Contract Duration (Optional)"
            type="text"
            placeholder="e.g., 3 months, 6 weeks, 1 year"
            value={formData.time_length || ''}
            onChange={(e) => onFormDataChange({ time_length: e.target.value })}
            helperText="How long will this position last?"
            disabled={isLoading}
          />
        </div>
      )}
    </>
  );
}
