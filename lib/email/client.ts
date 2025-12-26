// lib/email/client.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@krewup.net';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailParams): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.error('Email client not initialized. Check RESEND_API_KEY.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
