import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the action
vi.mock('../actions/profile-views-actions', () => ({
  trackProfileView: vi.fn(),
}));

import { trackProfileView } from '../actions/profile-views-actions';
import { useTrackProfileView } from './use-track-profile-view';

describe('useTrackProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track profile view when profileId is provided', async () => {
    vi.mocked(trackProfileView).mockResolvedValue({ success: true });

    renderHook(() => useTrackProfileView('user-123'));

    // Wait for effect to run
    await vi.waitFor(() => {
      expect(trackProfileView).toHaveBeenCalledWith('user-123');
    });
  });

  it('should not track when profileId is null', () => {
    renderHook(() => useTrackProfileView(null));

    expect(trackProfileView).not.toHaveBeenCalled();
  });

  it('should not track when profileId is undefined', () => {
    renderHook(() => useTrackProfileView(undefined));

    expect(trackProfileView).not.toHaveBeenCalled();
  });

  it('should not track when enabled is false', () => {
    renderHook(() => useTrackProfileView('user-123', false));

    expect(trackProfileView).not.toHaveBeenCalled();
  });

  it('should only track once even with re-renders', async () => {
    vi.mocked(trackProfileView).mockResolvedValue({ success: true });

    const { rerender } = renderHook(
      ({ profileId }) => useTrackProfileView(profileId),
      { initialProps: { profileId: 'user-123' } }
    );

    await vi.waitFor(() => {
      expect(trackProfileView).toHaveBeenCalledTimes(1);
    });

    // Re-render with same profileId
    rerender({ profileId: 'user-123' });

    // Should still only be called once
    expect(trackProfileView).toHaveBeenCalledTimes(1);
  });

  it('should handle tracking errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(trackProfileView).mockRejectedValue(new Error('Network error'));

    renderHook(() => useTrackProfileView('user-123'));

    await vi.waitFor(() => {
      expect(trackProfileView).toHaveBeenCalled();
    });

    // Should log error but not crash
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track profile view:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should track when enabled changes from false to true', async () => {
    vi.mocked(trackProfileView).mockResolvedValue({ success: true });

    const { rerender } = renderHook(
      ({ profileId, enabled }) => useTrackProfileView(profileId, enabled),
      { initialProps: { profileId: 'user-123', enabled: false } }
    );

    expect(trackProfileView).not.toHaveBeenCalled();

    // Enable tracking
    rerender({ profileId: 'user-123', enabled: true });

    await vi.waitFor(() => {
      expect(trackProfileView).toHaveBeenCalledWith('user-123');
    });
  });
});
