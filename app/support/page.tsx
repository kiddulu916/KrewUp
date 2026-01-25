import { Metadata } from 'next';
import { FeedbackForm } from '@/features/support/components/feedback-form';
import { Mail, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support & Feedback | KrewUp',
  description: 'Get help or share feedback about KrewUp',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support & Feedback</h1>
          <p className="text-gray-600">
            Have a question, found a bug, or want to suggest a feature? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Send us a message</h2>
          </div>
          <FeedbackForm />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Email us directly</h2>
          </div>
          <p className="text-gray-600 mb-2">
            Prefer email? Reach out to us at:
          </p>
          <a
            href="mailto:support@krewup.net"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            support@krewup.net
          </a>
          <p className="text-sm text-gray-500 mt-4">
            We typically respond within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
