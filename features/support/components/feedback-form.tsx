'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { submitFeedback } from '../actions/feedback-actions';
import type { FeedbackFormData } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  category: z.enum(['bug', 'feature', 'question', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'question',
    },
  });

  async function onSubmit(data: FeedbackFormData) {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage(null);

    const result = await submitFeedback(data);

    if (result.success) {
      setSubmitStatus('success');
      reset();
    } else {
      setSubmitStatus('error');
      setErrorMessage(result.error || 'Something went wrong');
    }

    setIsSubmitting(false);
  }

  if (submitStatus === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Thank you!</h3>
        <p className="text-green-700 mb-4">
          Your feedback has been sent. We&apos;ll get back to you soon.
        </p>
        <Button
          variant="outline"
          onClick={() => setSubmitStatus('idle')}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          {errorMessage}
        </div>
      )}

      <Input
        label="Name"
        {...register('name')}
        error={errors.name?.message}
        aria-invalid={errors.name ? 'true' : 'false'}
      />

      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        aria-invalid={errors.email ? 'true' : 'false'}
      />

      <div>
        <label
          htmlFor="category"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Category
        </label>
        <select
          id="category"
          {...register('category')}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="question">Question</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="other">Other</option>
        </select>
        {errors.category && (
          <p id="category-error" className="mt-1.5 text-sm text-red-600">
            {errors.category.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Message
        </label>
        <textarea
          id="message"
          {...register('message')}
          rows={5}
          className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-invalid={errors.message ? 'true' : 'false'}
        />
        {errors.message && (
          <p id="message-error" className="mt-1.5 text-sm text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending...' : 'Send Feedback'}
      </Button>
    </form>
  );
}
