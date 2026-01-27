// * Zod validation schemas for server actions
import { z } from 'zod';

// * Common field validations
export const emailSchema = z.string().email('Invalid email address');
export const uuidSchema = z.string().uuid('Invalid ID format');
export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format').optional();

// * User-related schemas
export const suspendUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
  durationDays: z.number().int().positive('Duration must be a positive number').max(365, 'Duration cannot exceed 365 days'),
});

export const banUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
});

// * Job-related schemas
export const createJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description is too long'),
  location: z.string().min(3, 'Location is required'),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'temporary'], {
    message: 'Invalid job type',
  }),
  trades: z.array(z.string()).min(1, 'At least one trade is required'),
  payRate: z.string().optional(),
  payMin: z.number().positive().optional(),
  payMax: z.number().positive().optional(),
  requiredCerts: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  jobId: uuidSchema,
});

// * Application-related schemas
export const updateApplicationStatusSchema = z.object({
  applicationId: uuidSchema,
  status: z.enum(['pending', 'viewed', 'hired', 'rejected'], {
    message: 'Invalid status',
  }),
});

export const createApplicationSchema = z.object({
  jobId: uuidSchema,
  coverLetter: z.string().max(5000, 'Cover letter is too long').optional(),
});

export const getJobApplicationsSchema = z.object({
  jobId: uuidSchema,
});

export const submitApplicationSchema = z.object({
  jobId: uuidSchema,
  formData: z.record(z.string(), z.unknown()), // ApplicationFormData is complex, validate at field level
  resumeUrl: z.string().url().optional(),
  coverLetterUrl: z.string().url().optional(),
  resumeExtractedText: z.string().optional(),
  customAnswers: z.record(z.string(), z.unknown()).optional(),
});

// * Message-related schemas
export const sendMessageSchema = z.object({
  conversationId: uuidSchema,
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

export const createConversationSchema = z.object({
  recipientId: uuidSchema,
  initialMessage: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long').optional(),
});

// * Profile-related schemas
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  bio: z.string().max(1000, 'Bio is too long').optional(),
  location: z.string().max(200, 'Location is too long').optional(),
  phone: phoneSchema,
});

export const updateProfileDataSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  phone: phoneSchema,
  location: z.string().max(200, 'Location is too long').optional(),
  trade: z.string().max(100).optional(),
  sub_trade: z.string().max(100).optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
  employer_type: z.string().max(50).optional(),
  company_name: z.string().max(100).optional(),
  profile_image_url: z.string().url().optional(),
  coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  csrfToken: z.string().min(1, 'CSRF token is required'),
});

// * Content report schemas
export const createContentReportSchema = z.object({
  reportedUserId: uuidSchema,
  contentId: z.string().min(1, 'Content ID is required'),
  contentType: z.enum(['profile', 'job', 'message', 'application'], {
    message: 'Invalid content type',
  }),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'fraud', 'other'], {
    message: 'Invalid reason',
  }),
  description: z.string().max(1000, 'Description is too long').optional(),
});

// * Admin moderation schemas
export const reviewContentReportSchema = z.object({
  reportId: uuidSchema,
  actionTaken: z.enum(['warning', 'suspension', 'ban', 'content_removed', 'dismissed'], {
    message: 'Invalid action',
  }),
  adminNotes: z.string().max(1000, 'Notes are too long').optional(),
});

// * Portfolio-related schemas
export const deletePortfolioPhotoSchema = z.object({
  imageId: uuidSchema,
});

export const reorderPortfolioPhotosSchema = z.object({
  imageIds: z
    .array(uuidSchema)
    .min(1, 'At least one image ID is required'),
});

// * Endorsement-related schemas
export const requestEndorsementSchema = z.object({
  experienceId: uuidSchema,
  employerEmail: emailSchema,
});

export const approveEndorsementSchema = z.object({
  requestId: uuidSchema,
  recommendationText: z
    .string()
    .max(200, 'Recommendation must be 200 characters or less')
    .optional(),
  verifiedDates: z.boolean().optional(),
});

export const getExperienceEndorsementsSchema = z.object({
  experienceId: uuidSchema,
});

// * Type exports for use in server actions
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type GetJobApplicationsInput = z.infer<typeof getJobApplicationsSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileDataInput = z.infer<typeof updateProfileDataSchema>;
export type CreateContentReportInput = z.infer<typeof createContentReportSchema>;
export type ReviewContentReportInput = z.infer<typeof reviewContentReportSchema>;
export type DeletePortfolioPhotoInput = z.infer<typeof deletePortfolioPhotoSchema>;
export type ReorderPortfolioPhotosInput = z.infer<typeof reorderPortfolioPhotosSchema>;
export type RequestEndorsementInput = z.infer<typeof requestEndorsementSchema>;
export type ApproveEndorsementInput = z.infer<typeof approveEndorsementSchema>;
export type GetExperienceEndorsementsInput = z.infer<typeof getExperienceEndorsementsSchema>;

