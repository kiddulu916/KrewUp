import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the action
const mockTrackJobView = vi.fn().mockResolvedValue({ success: true });

vi.mock('../actions/job-analytics-actions', () => ({
  trackJobView: (...args: any[]) => mockTrackJobView(...args),
}));

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};

beforeEach(() => {
  // Clear mocks
  vi.clearAllMocks();

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
      }),
    },
    writable: true,
  });
});

afterEach(() => {
  // Clear mock storage
  Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
});

import { useTrackJobView } from './use-track-job-view';

describe('useTrackJobView', () => {
  it('should call trackJobView with jobId and sessionId', async () => {
    renderHook(() => useTrackJobView('job-123'));

    // Wait for the effect to run
    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalled();
    });

    expect(mockTrackJobView).toHaveBeenCalledWith('job-123', expect.any(String));
  });

  it('should not track when jobId is null', async () => {
    renderHook(() => useTrackJobView(null));

    // Give effect time to potentially run
    await vi.waitFor(() => {
      expect(mockTrackJobView).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });

  it('should not track when jobId is undefined', async () => {
    renderHook(() => useTrackJobView(undefined));

    await vi.waitFor(() => {
      expect(mockTrackJobView).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });

  it('should not track when enabled is false', async () => {
    renderHook(() => useTrackJobView('job-123', false));

    await vi.waitFor(() => {
      expect(mockTrackJobView).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });

  it('should only track once even if re-rendered', async () => {
    const { rerender } = renderHook(
      ({ jobId }) => useTrackJobView(jobId),
      { initialProps: { jobId: 'job-123' } }
    );

    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalledTimes(1);
    });

    // Re-render with same props
    rerender({ jobId: 'job-123' });

    await vi.waitFor(() => {
      // Should still only have been called once
      expect(mockTrackJobView).toHaveBeenCalledTimes(1);
    }, { timeout: 100 });
  });

  it('should create session ID if not exists', async () => {
    renderHook(() => useTrackJobView('job-123'));

    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalled();
    });

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'job_view_session_id',
      expect.any(String)
    );
  });

  it('should use existing session ID if available', async () => {
    mockSessionStorage['job_view_session_id'] = 'existing-session-123';

    renderHook(() => useTrackJobView('job-456'));

    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalled();
    });

    expect(mockTrackJobView).toHaveBeenCalledWith('job-456', 'existing-session-123');
  });

  it('should handle trackJobView errors gracefully', async () => {
    mockTrackJobView.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw - errors are silently caught
    expect(() => {
      renderHook(() => useTrackJobView('job-123'));
    }).not.toThrow();

    // Verify trackJobView was called despite error
    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalledWith('job-123', expect.any(String));
    });
  });

  it('should track when enabled changes from false to true', async () => {
    const { rerender } = renderHook(
      ({ jobId, enabled }) => useTrackJobView(jobId, enabled),
      { initialProps: { jobId: 'job-123', enabled: false } }
    );

    await vi.waitFor(() => {
      expect(mockTrackJobView).not.toHaveBeenCalled();
    }, { timeout: 100 });

    // Enable tracking
    rerender({ jobId: 'job-123', enabled: true });

    await vi.waitFor(() => {
      expect(mockTrackJobView).toHaveBeenCalled();
    });
  });
});
