// features/applications/components/screening-answers-display.tsx
'use client';

import { Card } from '@/components/ui/card';
import type { CustomQuestion } from '@/features/jobs/components/custom-questions-builder';

interface ScreeningAnswersDisplayProps {
  questions: CustomQuestion[];
  answers: Record<string, string>;
}

export function ScreeningAnswersDisplay({
  questions,
  answers,
}: ScreeningAnswersDisplayProps) {
  if (!questions || questions.length === 0 || !answers) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Screening Responses</h3>

      <div className="space-y-6">
        {questions.map((q, index) => {
          const answer = answers[index.toString()];

          if (!answer) return null;

          return (
            <div key={index} className="pb-6 border-b last:border-0 last:pb-0">
              <div className="flex items-start gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">
                    {q.question}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(answers).length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No answers provided
        </p>
      )}
    </Card>
  );
}
