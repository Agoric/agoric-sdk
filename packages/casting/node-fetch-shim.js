/* global globalThis */
import fetch from 'node-fetch';

// @ts-expect-error node-fetch does not exactly match W3C Fetch
globalThis.fetch = fetch;
