/**
 * Wait a random delay between min and max milliseconds (humanized)
 */
export function humanDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Wait with random variation (±20% around the base)
 */
export function randomizedDelay(baseMs: number): Promise<void> {
  const variation = baseMs * 0.2;
  const min = Math.floor(baseMs - variation);
  const max = Math.floor(baseMs + variation);
  return humanDelay(min, max);
}

/**
 * Short delay (1-3 seconds) for between-action pauses
 */
export function shortDelay(): Promise<void> {
  return humanDelay(1000, 3000);
}

/**
 * Medium delay (3-6 seconds) for page scrolls
 */
export function mediumDelay(): Promise<void> {
  return humanDelay(3000, 6000);
}

/**
 * Long delay (5-10 seconds) for between-page navigation
 */
export function longDelay(): Promise<void> {
  return humanDelay(5000, 10000);
}
