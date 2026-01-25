'use server';

import { sendEmail } from '@/lib/email/client';
import { z } from 'zod';
import type { FeedbackFormData, FeedbackSubmitResult } from '../types';

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  category: z.enum(['bug', 'feature', 'question', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export async function submitFeedback(data: FeedbackFormData): Promise<FeedbackSubmitResult> {
  // Validate input
  const parsed = feedbackSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input'
    };
  }

  const { name, email, category, message } = parsed.data;

  const categoryLabels = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    question: 'Question',
    other: 'Other',
  };

  const htmlContent = `
    <h2>New Feedback from KrewUp</h2>
    <p><strong>From:</strong> ${name} (${email})</p>
    <p><strong>Category:</strong> ${categoryLabels[category]}</p>
    <hr />
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br />')}</p>
    <hr />
    <p><em>Sent from KrewUp Support Page</em></p>
  `;

  const result = await sendEmail({
    to: 'cor.hilsen@gmail.com',
    subject: `[KrewUp ${categoryLabels[category]}] from ${name}`,
    html: htmlContent,
  });

  if (!result.success) {
    return { success: false, error: 'Failed to send feedback. Please try again.' };
  }

  return { success: true };
}
