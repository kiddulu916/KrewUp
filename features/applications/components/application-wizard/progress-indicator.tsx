'use client';

import { Check } from 'lucide-react';

/**
 * Step labels for the application wizard
 */
const STEP_LABELS = [
  'Documents',
  'Personal Info',
  'Contact',
  'Work Auth',
  'Work History',
  'Education',
  'Skills',
  'References',
];

/**
 * Progress Indicator Component
 *
 * Displays the current step in the application wizard with clickable step indicators.
 * Shows visual progress through the 8-step application process.
 *
 * @param currentStep - Current step number (1-8)
 * @param totalSteps - Total number of steps (8 or 9 with screening questions)
 * @param onStepClick - Callback when a completed step is clicked
 * @param hasScreeningQuestions - Whether screening questions step is included
 */

type Props = {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  hasScreeningQuestions?: boolean;
};

export function ProgressIndicator({
  currentStep,
  totalSteps,
  onStepClick,
  hasScreeningQuestions = false,
}: Props) {
  const percentage = (currentStep / totalSteps) * 100;

  // Build step labels - insert screening questions after step 3 if present
  const stepLabels = hasScreeningQuestions
    ? [...STEP_LABELS.slice(0, 3), 'Questions', ...STEP_LABELS.slice(3)]
    : STEP_LABELS;

  // Limit to totalSteps
  const displayedSteps = stepLabels.slice(0, totalSteps);

  function handleStepClick(step: number) {
    // Only allow clicking on completed steps (before current step)
    if (step < currentStep && onStepClick) {
      onStepClick(step);
    }
  }

  return (
    <div className="mt-4">
      {/* Text progress indicator */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">{Math.round(percentage)}% Complete</span>
      </div>

      {/* Visual progress bar */}
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Application progress: step ${currentStep} of ${totalSteps}`}
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4"
      >
        <div
          className="h-full bg-krewup-blue transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="hidden sm:flex justify-between items-center">
        {displayedSteps.map((label, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <button
              key={step}
              type="button"
              onClick={() => handleStepClick(step)}
              disabled={!isClickable}
              className={`flex flex-col items-center group ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              aria-label={`${isCompleted ? 'Go to' : ''} Step ${step}: ${label}${
                isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white group-hover:bg-green-600'
                    : isCurrent
                    ? 'bg-krewup-blue text-white ring-2 ring-krewup-blue ring-offset-2'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  step
                )}
              </div>
              {/* Step label */}
              <span
                className={`mt-1 text-xs max-w-[60px] text-center truncate ${
                  isCompleted
                    ? 'text-green-600 group-hover:text-green-700'
                    : isCurrent
                    ? 'text-krewup-blue font-medium'
                    : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: simplified step dots */}
      <div className="flex sm:hidden justify-center gap-2">
        {displayedSteps.map((label, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <button
              key={step}
              type="button"
              onClick={() => handleStepClick(step)}
              disabled={!isClickable}
              className={`w-3 h-3 rounded-full transition-all ${
                isCompleted
                  ? 'bg-green-500 hover:bg-green-600'
                  : isCurrent
                  ? 'bg-krewup-blue ring-2 ring-krewup-blue ring-offset-1'
                  : 'bg-gray-200'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`Step ${step}: ${label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}
