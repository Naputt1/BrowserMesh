import { describe, it, expect, vi } from 'vitest';
import { PauseController } from '../pause-controller.js';

describe('PauseController', () => {
  it('starts not paused', () => {
    const pc = new PauseController();
    expect(pc.isPaused).toBe(false);
  });

  it('pause sets isPaused to true', () => {
    const pc = new PauseController();
    pc.pause();
    expect(pc.isPaused).toBe(true);
  });

  it('resume sets isPaused back to false', () => {
    const pc = new PauseController();
    pc.pause();
    pc.resume();
    expect(pc.isPaused).toBe(false);
  });

  it('waitIfPaused resolves immediately when not paused', async () => {
    const pc = new PauseController();
    await expect(pc.waitIfPaused()).resolves.toBeUndefined();
  });

  it('waitIfPaused blocks while paused and resolves on resume', async () => {
    const pc = new PauseController();
    pc.pause();

    let resolved = false;
    const waitPromise = pc.waitIfPaused().then(() => {
      resolved = true;
    });

    await vi.waitFor(() => expect(resolved).toBe(false));

    pc.resume();
    await waitPromise;
    expect(resolved).toBe(true);
  });

  it('supports multiple pause/resume cycles', async () => {
    const pc = new PauseController();

    for (let i = 0; i < 3; i++) {
      pc.pause();
      expect(pc.isPaused).toBe(true);

      let resolved = false;
      const waitPromise = pc.waitIfPaused().then(() => {
        resolved = true;
      });
      await vi.waitFor(() => expect(resolved).toBe(false));

      pc.resume();
      await waitPromise;
      expect(resolved).toBe(true);
      expect(pc.isPaused).toBe(false);
    }
  });

  it('resume on non-paused controller is a no-op', () => {
    const pc = new PauseController();
    pc.resume();
    expect(pc.isPaused).toBe(false);
  });

  it('multiple waiters all resolve on resume', async () => {
    const pc = new PauseController();
    pc.pause();

    let count = 0;
    const w1 = pc.waitIfPaused().then(() => {
      count++;
    });
    const w2 = pc.waitIfPaused().then(() => {
      count++;
    });
    const w3 = pc.waitIfPaused().then(() => {
      count++;
    });

    await vi.waitFor(() => expect(count).toBe(0));

    pc.resume();
    await Promise.all([w1, w2, w3]);
    expect(count).toBe(3);
  });
});
