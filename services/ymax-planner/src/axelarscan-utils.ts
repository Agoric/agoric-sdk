import type { SearchGMPResponse, SearchGMPResponseData } from '@axelarjs/api';

/**
 * ABI naming convention:
 * - *_ABI_JSON: JSON ABI representation (objects with type, name, components)
 * - *_ABI_TEXT: Human-readable string format (Ethers fragment strings)
 *
 * @see https://github.com/agoric-labs/agoric-to-axelar-local/blob/b884729ab2d24decabcc4a682f4157f9cf78a08b/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L26-L29
 */
export const GMP_INPUTS_ABI_JSON = [
  {
    type: 'tuple',
    name: 'callMessage',
    components: [
      { name: 'id', type: 'string' },
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
  },
];

/**
 * Fetches all paginated data from an API endpoint by making multiple requests.
 * @param {string} url - The API endpoint URL
 * @param {function(number, number): object} getRequestBody - Function that generates request body given pageSize and offset
 * @param {typeof fetch} fetch - Fetch function
 * @param {number} [pageSize=25] - Number of items to fetch per page
 * @returns {Promise<Array<SearchGMPResponseData>>} Array containing all fetched data across all pages
 */
export const fetchAllPaginated = harden(
  async (url, getRequestBody, fetch, pageSize = 25) => {
    const allData: SearchGMPResponseData[] = [];
    let from = 0;
    await null;
    while (true) {
      const response: Response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getRequestBody(pageSize, from)),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch paginated data from ${url}: ${response.status} ${response.statusText}`,
        );
      }

      const result: SearchGMPResponse = await response.json();
      const { data, total } = result;
      allData.push(...data);

      if (allData.length >= total || data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return allData;
  },
);
