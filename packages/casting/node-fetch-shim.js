// @jessie-check

/* global globalThis */
import fetch from 'node-fetch';
import { bootstrap } from 'global-agent';

// @ts-expect-error node-fetch does not exactly match W3C Fetch
globalThis.fetch = fetch;
bootstrap();
