// features/applications/components/application-wizard/step-screening-questions.tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { ScreeningQuestionsForm } from '../screening-questions-form';
import type { CustomQuestion } from '@/features/jobs/components/custom-questions-builder';

interface StepScreeningQuestionsProps {
  questions: CustomQuestion[];
}

export function StepScreeningQuestions({ questions }: StepScreeningQuestionsProps) {
  const form = useFormContext();
  const answers = form.watch('customAnswers') || {};
  const errors = form.formState.errors.customAnswers as Record<string, any> || {};

  const handleChange = (newAnswers: Record<string, string>) => {
    form.setValue('customAnswers', newAnswers, { shouldValidate: true });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Screening Questions</h2>
      <p className="text-gray-600 mb-6">
        The employer has asked some specific questions about this position.
      </p>

      <ScreeningQuestionsForm
        questions={questions}
        value={answers}
        onChange={handleChange}
        errors={errors}
      />
    </div>
  );
}
