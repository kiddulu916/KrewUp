// features/applications/components/screening-questions-form.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { CustomQuestion } from '@/features/jobs/components/custom-questions-builder';

interface ScreeningQuestionsFormProps {
  questions: CustomQuestion[];
  value: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
  errors?: Record<string, string>;
}

export function ScreeningQuestionsForm({
  questions,
  value,
  onChange,
  errors = {},
}: ScreeningQuestionsFormProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  const handleAnswerChange = (index: number, answer: string) => {
    onChange({
      ...value,
      [index.toString()]: answer,
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Screening Questions</h3>
      <p className="text-sm text-gray-600 mb-6">
        Please answer the following questions from the employer.
        Questions marked with * are required.
      </p>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={index}>
            <label className="block mb-2">
              <span className="text-sm font-medium">
                {index + 1}. {q.question}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            <textarea
              value={value[index.toString()] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              placeholder="Type your answer here..."
              className={`
                w-full px-3 py-2 text-sm border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors[index.toString()] ? 'border-red-500' : 'border-gray-300'}
              `}
              rows={3}
            />
            {errors[index.toString()] && (
              <p className="mt-1 text-xs text-red-600">
                {errors[index.toString()]}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
