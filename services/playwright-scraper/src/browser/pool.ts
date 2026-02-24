/**
 * Browser session pool — limits concurrent Playwright sessions
 * to stay within Railway's 1GB memory constraint.
 *
 * Uses a promise-based semaphore. Does NOT keep browsers alive
 * between requests (each scrape launches fresh and closes on completion).
 */

class BrowserPool {
  private maxConcurrent: number;
  private active = 0;
  private queue: Array<{ resolve: () => void }> = [];

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Acquire a slot. If all slots are in use, waits until one is released.
   */
  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return;
    }
    // All slots occupied — wait in queue
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
    });
  }

  /**
   * Release a slot. Wakes up the next queued request if any.
   */
  release(): void {
    if (this.queue.length > 0) {
      // Don't decrement — hand the slot directly to the next waiter
      const next = this.queue.shift()!;
      next.resolve();
    } else {
      this.active--;
    }
  }

  get activeCount(): number {
    return this.active;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get maxSessions(): number {
    return this.maxConcurrent;
  }
}

export const browserPool = new BrowserPool(2);
