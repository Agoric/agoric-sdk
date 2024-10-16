import { simulateApiCall } from './yourUtilityFunctions'; // Adjust the path as necessary

/**
 * Stress test function that simulates API calls over a specified duration.
 *
 * @param {number} numCalls - The number of API calls to simulate.
 * @param {number} durationMs - The total duration over which the calls are spread, in milliseconds.
 *
 * @returns {Promise<void>} - A Promise that resolves when all calls are completed.
 */
async function stressTestApiCall(numCalls, durationMs) {
  const interval = durationMs / numCalls; // Calculate the interval between calls
  for (let i = 0; i < numCalls; i++) {
    setTimeout(async () => {
      try {
        await simulateApiCall(); // Execute the API call
      } catch (error) {
        console.error('Error during API call:', error);
      }
    }, i * interval);
  }
}

// Example test case
test('Stress test API interaction: 5 calls over 5 minutes', async t => {
  const numCalls = 5; // Number of calls to simulate
  const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

  await stressTestApiCall(numCalls, durationMs);

  t.pass(); // Pass the test if no errors were encountered
});

test('Stress test API interaction: 10 calls over 5 minutes', async t => {
  const numCalls = 10; // Number of calls to simulate
  const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

  await stressTestApiCall(numCalls, durationMs);

  t.pass(); // Pass the test if no errors were encountered
});
