export interface FeedbackFormData {
  name: string;
  email: string;
  category: 'bug' | 'feature' | 'question' | 'other';
  message: string;
}

export interface FeedbackSubmitResult {
  success: boolean;
  error?: string;
}
