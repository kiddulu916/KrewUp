/**
 * Application Service Integration Tests
 *
 * Tests pure business logic for job applications with ZERO MOCKS.
 * All functions are pure and can be tested directly.
 */

import { describe, it, expect } from 'vitest';
import {
  validateApplicationInput,
  validateCoverLetter,
  validateCustomAnswers,
  validateApplicationStatus,
  validateStatusTransition,
  buildApplicationRecord,
  sanitizeCustomAnswers,
  isTerminalStatus,
  getAllowedTransitions,
  canWithdrawApplication,
  MAX_COVER_LETTER_LENGTH,
  MIN_COVER_LETTER_LENGTH,
  MAX_CUSTOM_ANSWER_LENGTH,
  VALID_STATUS_TRANSITIONS,
  type ApplicationInput,
  type CustomQuestion,
} from '@/features/applications/services/application-service';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/constants';

// ============================================================================
// validateApplicationInput
// ============================================================================

describe('validateApplicationInput', () => {
  describe('valid inputs', () => {
    it('should accept valid input with jobId only', () => {
      const input: ApplicationInput = { jobId: 'job-123' };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid input with jobId and cover letter', () => {
      const input: ApplicationInput = {
        jobId: 'job-123',
        coverLetter: 'This is a valid cover letter with sufficient length.',
      };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(true);
    });

    it('should accept valid input with all fields', () => {
      const input: ApplicationInput = {
        jobId: 'job-123',
        coverLetter: 'A cover letter that meets the minimum requirements.',
        customAnswers: { q0: 'Answer 1', q1: 'Answer 2' },
      };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing jobId', () => {
      const input = {} as ApplicationInput;
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Job ID is required');
      expect(result.field).toBe('jobId');
    });

    it('should reject empty jobId', () => {
      const input: ApplicationInput = { jobId: '' };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(false);
      // Empty string is falsy, so it triggers "is required" before trim check
      expect(result.error).toBe('Job ID is required');
      expect(result.field).toBe('jobId');
    });

    it('should reject whitespace-only jobId', () => {
      const input: ApplicationInput = { jobId: '   ' };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Job ID cannot be empty');
      expect(result.field).toBe('jobId');
    });

    it('should reject invalid cover letter when provided', () => {
      const input: ApplicationInput = {
        jobId: 'job-123',
        coverLetter: 'short', // Less than 10 chars
      };
      const result = validateApplicationInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('coverLetter');
    });
  });
});

// ============================================================================
// validateCoverLetter
// ============================================================================

describe('validateCoverLetter', () => {
  describe('optional behavior', () => {
    it('should accept undefined cover letter', () => {
      const result = validateCoverLetter(undefined);
      expect(result.valid).toBe(true);
    });

    it('should accept null cover letter', () => {
      const result = validateCoverLetter(null);
      expect(result.valid).toBe(true);
    });

    it('should accept empty string cover letter', () => {
      const result = validateCoverLetter('');
      expect(result.valid).toBe(true);
    });

    it('should accept whitespace-only cover letter as empty', () => {
      const result = validateCoverLetter('   ');
      expect(result.valid).toBe(true);
    });
  });

  describe('length validation', () => {
    it('should accept cover letter at minimum length boundary', () => {
      const coverLetter = 'A'.repeat(MIN_COVER_LETTER_LENGTH);
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(true);
    });

    it('should accept cover letter at maximum length boundary', () => {
      const coverLetter = 'A'.repeat(MAX_COVER_LETTER_LENGTH);
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(true);
    });

    it('should reject cover letter below minimum length', () => {
      const coverLetter = 'A'.repeat(MIN_COVER_LETTER_LENGTH - 1);
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Cover letter must be at least ${MIN_COVER_LETTER_LENGTH} characters`);
      expect(result.field).toBe('coverLetter');
    });

    it('should reject cover letter above maximum length', () => {
      const coverLetter = 'A'.repeat(MAX_COVER_LETTER_LENGTH + 1);
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Cover letter must be less than ${MAX_COVER_LETTER_LENGTH} characters`);
      expect(result.field).toBe('coverLetter');
    });

    it('should accept valid cover letter within bounds', () => {
      const coverLetter = 'This is a perfectly valid cover letter for the job application.';
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(true);
    });
  });

  describe('trimming behavior', () => {
    it('should consider trimmed length for minimum check', () => {
      // 5 chars + whitespace padding - after trim still too short
      const coverLetter = '  abc  ';
      const result = validateCoverLetter(coverLetter);
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// validateCustomAnswers
// ============================================================================

describe('validateCustomAnswers', () => {
  describe('no questions', () => {
    it('should accept when no questions defined', () => {
      const result = validateCustomAnswers({ q0: 'answer' }, []);
      expect(result.valid).toBe(true);
    });

    it('should accept undefined questions array', () => {
      const result = validateCustomAnswers({ q0: 'answer' }, undefined as unknown as CustomQuestion[]);
      expect(result.valid).toBe(true);
    });
  });

  describe('required questions', () => {
    it('should accept when required question has answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Why do you want this job?', required: true },
      ];
      const answers = { q0: 'Because it aligns with my career goals.' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(true);
    });

    it('should reject when required question has no answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Why do you want this job?', required: true },
      ];
      const result = validateCustomAnswers({}, questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Answer required for: "Why do you want this job?"');
      expect(result.field).toBe('customAnswers.q0');
    });

    it('should reject when required question has empty answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Tell us about yourself', required: true },
      ];
      const answers = { q0: '' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(false);
    });

    it('should reject when required question has whitespace-only answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Tell us about yourself', required: true },
      ];
      const answers = { q0: '   ' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(false);
    });
  });

  describe('optional questions', () => {
    it('should accept when optional question has no answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Any additional comments?', required: false },
      ];
      const result = validateCustomAnswers({}, questions);
      expect(result.valid).toBe(true);
    });

    it('should accept when optional question has answer', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Any additional comments?', required: false },
      ];
      const answers = { q0: 'Here are some additional comments.' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(true);
    });
  });

  describe('answer length validation', () => {
    it('should accept answer at maximum length', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Describe your experience', required: true },
      ];
      const answers = { q0: 'A'.repeat(MAX_CUSTOM_ANSWER_LENGTH) };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(true);
    });

    it('should reject answer exceeding maximum length', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Describe your experience', required: true },
      ];
      const answers = { q0: 'A'.repeat(MAX_CUSTOM_ANSWER_LENGTH + 1) };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Answer too long for question 1 (max ${MAX_CUSTOM_ANSWER_LENGTH} characters)`);
      expect(result.field).toBe('customAnswers.q0');
    });
  });

  describe('multiple questions', () => {
    it('should validate all questions in order', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'Required question 1', required: true },
        { id: 'q1', question: 'Optional question', required: false },
        { id: 'q2', question: 'Required question 2', required: true },
      ];
      const answers = { q0: 'Answer 1', q2: 'Answer 2' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(true);
    });

    it('should fail on first invalid question', () => {
      const questions: CustomQuestion[] = [
        { id: 'q0', question: 'First required', required: true },
        { id: 'q1', question: 'Second required', required: true },
      ];
      const answers = { q1: 'Only second answered' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('customAnswers.q0');
    });
  });

  describe('question ID fallback', () => {
    it('should use index-based ID when question has no id', () => {
      const questions: CustomQuestion[] = [
        { question: 'Question without ID', required: true },
      ];
      const answers = { q0: 'Answer using fallback ID' };
      const result = validateCustomAnswers(answers, questions);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// validateApplicationStatus
// ============================================================================

describe('validateApplicationStatus', () => {
  describe('valid statuses', () => {
    it.each(APPLICATION_STATUSES)('should accept valid status: %s', (status) => {
      const result = validateApplicationStatus(status);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid statuses', () => {
    it('should reject empty status', () => {
      const result = validateApplicationStatus('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Status is required');
      expect(result.field).toBe('status');
    });

    it('should reject invalid status string', () => {
      const result = validateApplicationStatus('invalid_status');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status: invalid_status');
      expect(result.error).toContain('Must be one of:');
    });

    it('should reject null-like values', () => {
      const result = validateApplicationStatus(null as unknown as string);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined-like values', () => {
      const result = validateApplicationStatus(undefined as unknown as string);
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// validateStatusTransition
// ============================================================================

describe('validateStatusTransition', () => {
  describe('valid transitions from pending', () => {
    it.each(['viewed', 'contacted', 'rejected', 'hired'] as const)(
      'should allow pending → %s',
      (to) => {
        const result = validateStatusTransition('pending', to);
        expect(result.valid).toBe(true);
      }
    );
  });

  describe('valid transitions from viewed', () => {
    it.each(['contacted', 'rejected', 'hired'] as const)(
      'should allow viewed → %s',
      (to) => {
        const result = validateStatusTransition('viewed', to);
        expect(result.valid).toBe(true);
      }
    );
  });

  describe('valid transitions from contacted', () => {
    it.each(['rejected', 'hired'] as const)(
      'should allow contacted → %s',
      (to) => {
        const result = validateStatusTransition('contacted', to);
        expect(result.valid).toBe(true);
      }
    );
  });

  describe('invalid transitions', () => {
    it('should reject viewed → pending (backward transition)', () => {
      const result = validateStatusTransition('viewed', 'pending');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from "viewed" to "pending"');
    });

    it('should reject contacted → viewed (backward transition)', () => {
      const result = validateStatusTransition('contacted', 'viewed');
      expect(result.valid).toBe(false);
    });

    it('should reject contacted → pending (backward transition)', () => {
      const result = validateStatusTransition('contacted', 'pending');
      expect(result.valid).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('should reject any transition from rejected', () => {
      const result = validateStatusTransition('rejected', 'pending');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot change status from "rejected" - this is a terminal state');
    });

    it('should reject any transition from hired', () => {
      const result = validateStatusTransition('hired', 'pending');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot change status from "hired" - this is a terminal state');
    });

    it.each(['pending', 'viewed', 'contacted', 'rejected', 'hired'] as const)(
      'should reject rejected → %s',
      (to) => {
        const result = validateStatusTransition('rejected', to);
        expect(result.valid).toBe(false);
      }
    );

    it.each(['pending', 'viewed', 'contacted', 'rejected', 'hired'] as const)(
      'should reject hired → %s',
      (to) => {
        const result = validateStatusTransition('hired', to);
        expect(result.valid).toBe(false);
      }
    );
  });
});

// ============================================================================
// buildApplicationRecord
// ============================================================================

describe('buildApplicationRecord', () => {
  it('should build basic record with required fields', () => {
    const input: ApplicationInput = { jobId: 'job-123' };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record).toEqual({
      job_id: 'job-123',
      applicant_id: 'user-456',
      cover_letter: null,
      custom_answers: null,
      status: 'pending',
    });
  });

  it('should include cover letter when provided', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: 'My cover letter',
    };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.cover_letter).toBe('My cover letter');
  });

  it('should trim cover letter whitespace', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: '  My cover letter with whitespace  ',
    };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.cover_letter).toBe('My cover letter with whitespace');
  });

  it('should include custom answers when provided', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      customAnswers: { q0: 'Answer 1', q1: 'Answer 2' },
    };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.custom_answers).toEqual({ q0: 'Answer 1', q1: 'Answer 2' });
  });

  it('should always set status to pending', () => {
    const input: ApplicationInput = { jobId: 'job-123' };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.status).toBe('pending');
  });

  it('should handle empty string cover letter as null', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: '',
    };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.cover_letter).toBe(null);
  });
});

// ============================================================================
// sanitizeCustomAnswers
// ============================================================================

describe('sanitizeCustomAnswers', () => {
  it('should return empty object for undefined input', () => {
    const result = sanitizeCustomAnswers(undefined);
    expect(result).toEqual({});
  });

  it('should trim whitespace from all values', () => {
    const answers = {
      q0: '  answer with leading space',
      q1: 'answer with trailing space  ',
      q2: '  answer with both  ',
    };
    const result = sanitizeCustomAnswers(answers);

    expect(result).toEqual({
      q0: 'answer with leading space',
      q1: 'answer with trailing space',
      q2: 'answer with both',
    });
  });

  it('should preserve keys exactly', () => {
    const answers = {
      'question-1': 'answer 1',
      custom_key: 'answer 2',
      q0: 'answer 3',
    };
    const result = sanitizeCustomAnswers(answers);

    expect(Object.keys(result)).toEqual(['question-1', 'custom_key', 'q0']);
  });

  it('should handle empty object', () => {
    const result = sanitizeCustomAnswers({});
    expect(result).toEqual({});
  });

  it('should handle already trimmed values', () => {
    const answers = { q0: 'already trimmed' };
    const result = sanitizeCustomAnswers(answers);
    expect(result).toEqual({ q0: 'already trimmed' });
  });
});

// ============================================================================
// isTerminalStatus
// ============================================================================

describe('isTerminalStatus', () => {
  it('should return true for rejected', () => {
    expect(isTerminalStatus('rejected')).toBe(true);
  });

  it('should return true for hired', () => {
    expect(isTerminalStatus('hired')).toBe(true);
  });

  it('should return false for pending', () => {
    expect(isTerminalStatus('pending')).toBe(false);
  });

  it('should return false for viewed', () => {
    expect(isTerminalStatus('viewed')).toBe(false);
  });

  it('should return false for contacted', () => {
    expect(isTerminalStatus('contacted')).toBe(false);
  });
});

// ============================================================================
// getAllowedTransitions
// ============================================================================

describe('getAllowedTransitions', () => {
  it('should return all transitions for pending', () => {
    const transitions = getAllowedTransitions('pending');
    expect(transitions).toEqual(['viewed', 'contacted', 'rejected', 'hired']);
  });

  it('should return transitions for viewed', () => {
    const transitions = getAllowedTransitions('viewed');
    expect(transitions).toEqual(['contacted', 'rejected', 'hired']);
  });

  it('should return transitions for contacted', () => {
    const transitions = getAllowedTransitions('contacted');
    expect(transitions).toEqual(['rejected', 'hired']);
  });

  it('should return empty array for rejected', () => {
    const transitions = getAllowedTransitions('rejected');
    expect(transitions).toEqual([]);
  });

  it('should return empty array for hired', () => {
    const transitions = getAllowedTransitions('hired');
    expect(transitions).toEqual([]);
  });
});

// ============================================================================
// canWithdrawApplication
// ============================================================================

describe('canWithdrawApplication', () => {
  it('should return true for pending', () => {
    expect(canWithdrawApplication('pending')).toBe(true);
  });

  it('should return true for viewed', () => {
    expect(canWithdrawApplication('viewed')).toBe(true);
  });

  it('should return false for contacted', () => {
    expect(canWithdrawApplication('contacted')).toBe(false);
  });

  it('should return false for rejected', () => {
    expect(canWithdrawApplication('rejected')).toBe(false);
  });

  it('should return false for hired', () => {
    expect(canWithdrawApplication('hired')).toBe(false);
  });
});

// ============================================================================
// Constants Verification
// ============================================================================

describe('Constants', () => {
  it('should have correct MIN_COVER_LETTER_LENGTH', () => {
    expect(MIN_COVER_LETTER_LENGTH).toBe(10);
  });

  it('should have correct MAX_COVER_LETTER_LENGTH', () => {
    expect(MAX_COVER_LETTER_LENGTH).toBe(5000);
  });

  it('should have correct MAX_CUSTOM_ANSWER_LENGTH', () => {
    expect(MAX_CUSTOM_ANSWER_LENGTH).toBe(2000);
  });

  it('should have VALID_STATUS_TRANSITIONS for all statuses', () => {
    expect(Object.keys(VALID_STATUS_TRANSITIONS)).toEqual(
      expect.arrayContaining(['pending', 'viewed', 'contacted', 'rejected', 'hired'])
    );
  });
});
