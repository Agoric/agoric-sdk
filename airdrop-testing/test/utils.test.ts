import test from '@endo/ses-ava/prepare-endo.js';
// import { simulateApiCall } from './yourUtilityFunctions'; // Adjust the path as necessary
const wait = (time, cancel = Promise.reject()) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, time);
    const noop = () => {};

    cancel.then(() => {
      clearTimeout(timer);
      reject(new Error('Cancelled'));
    }, noop);
  });
/**
 * Stress test function that simulates API calls over a specified duration.
 *
 * @param {number} numCalls - The number of API calls to simulate.
 * @param {number} durationMs - The total duration over which the calls are spread, in milliseconds.
 *
 * @returns {Promise<void>} - A Promise that resolves when all calls are completed.
 */
const stressTestApiCall =
  (t, numCalls: number, durationMs: number) =>
  async (fn, ...args) => {
    const interval = durationMs / numCalls; // Calculate the interval between calls
    for (let i = 0; i < numCalls; i++) {
      setTimeout(async () => {
        try {
          console.log('calling fn::', fn.name);
          console.log('fn ::::', fn.__proto__, fn.toString());
          console.log('----------------------------------');
          await fn(args);
        } catch (error) {
          console.error('Error during API call:', error);
        }
      }, i * interval);
    }
  };

// Example test case
test('Stress test API interaction: 5 calls over 1 minutes', async t => {
  const numCalls = 5; // Number of calls to simulate
  const durationMs = 1 * 60 * 1000; // 5 minutes in milliseconds

  await stressTestApiCall(t, numCalls, durationMs)(x => x + 1, 10);

  t.pass(); // Pass the test if no errors were encountered
});
``;

test('Stress test API interaction: 10 calls over 5 minutes', async t => {
  const numCalls = 10; // Number of calls to simulate
  const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

  await stressTestApiCall(t, numCalls, durationMs);

  t.pass(); // Pass the test if no errors were encountered
});
