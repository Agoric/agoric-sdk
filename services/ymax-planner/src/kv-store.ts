/**
 * Key-value store interface for storing and retrieving configuration values.
 * This abstraction allows for different storage backends to be plugged in.
 */

export interface KeyValueStore {
  /**
   * Get a value from the store by key
   * @param key - The key to retrieve
   * @returns The value if found, undefined otherwise
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Set a value in the store
   * @param key - The key to set
   * @param value - The value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Delete a value from the store
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists in the store
   * @param key - The key to check
   */
  has(key: string): Promise<boolean>;
}

/**
 * In-memory implementation of KeyValueStore.
 * Useful for testing or as a default implementation.
 */
export class InMemoryKeyValueStore implements KeyValueStore {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

export const KV_KEYS = {
  RESOLVER_LAST_ACTIVE_TIME: 'RESOLVER_LAST_ACTIVE_TIME',
} as const;

/**
 * Helper to get the resolver's last active time from the store
 * @param store - The key-value store instance
 * @returns The timestamp in milliseconds, or undefined if not found
 */
export const getResolverLastActiveTime = async (
  store: KeyValueStore,
): Promise<number | undefined> => {
  const value = await store.get(KV_KEYS.RESOLVER_LAST_ACTIVE_TIME);
  if (value === undefined) return undefined;

  const timestamp = Number(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

/**
 * Helper to set the resolver's last active time in the store
 * @param store - The key-value store instance
 * @param timestampMs - The timestamp in milliseconds
 */
export const setResolverLastActiveTime = async (
  store: KeyValueStore,
  timestampMs: number,
): Promise<void> => {
  await store.set(KV_KEYS.RESOLVER_LAST_ACTIVE_TIME, String(timestampMs));
};
