import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadConvexApi(config) {
  vi.resetModules();
  localStorage.clear();
  window.SCORCHED_EARTH_CONFIG = config;
  return import('../../js/convex-api.js');
}

describe('convex-api offline runtime config', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes in local-only mode without requiring a Convex URL', async () => {
    const ConvexAPI = await loadConvexApi({
      SERVICE_MODE: 'offline',
      OFFLINE_SERVICES: true,
      CONVEX_URL: ''
    });

    const result = await ConvexAPI.init();
    const status = ConvexAPI.getConnectionStatus();

    expect(result.offlineServices).toBe(true);
    expect(result.serviceMode).toBe('offline');
    expect(result.convexAvailable).toBe(false);
    expect(status).toMatchObject({
      isOnline: false,
      convexAvailable: false,
      offlineServices: true,
      serviceMode: 'offline',
      queuedActions: 0
    });
  });

  it('keeps scores local and does not queue network retries in offline service mode', async () => {
    const ConvexAPI = await loadConvexApi({
      SERVICE_MODE: 'offline',
      OFFLINE_SERVICES: true,
      CONVEX_URL: ''
    });

    await ConvexAPI.init();
    const result = await ConvexAPI.submitScore({
      totalScore: 1200,
      roundsSurvived: 4
    });
    const leaderboard = await ConvexAPI.getLeaderboard();

    expect(result).toMatchObject({
      success: true,
      _offline: true,
      _queued: false
    });
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]).toMatchObject({
      totalScore: 1200,
      roundsSurvived: 4
    });
    expect(ConvexAPI.getConnectionStatus().queuedActions).toBe(0);
  });

  it('does not retry network connections while offline services are explicit', async () => {
    const ConvexAPI = await loadConvexApi({
      SERVICE_MODE: 'offline',
      OFFLINE_SERVICES: true,
      CONVEX_URL: ''
    });

    await ConvexAPI.init();

    await expect(ConvexAPI.retryConnection()).resolves.toBe(false);
    expect(ConvexAPI.getConnectionStatus().offlineServices).toBe(true);
  });
});
