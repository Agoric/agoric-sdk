import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { decodeAbiParameters } from 'viem';
import type {
  GMPTxStatus,
  SearchGMPResponse,
  SearchGMPResponseData,
} from '@axelarjs/api';

/**
 * @see https://github.com/agoric-labs/agoric-to-axelar-local/blob/b884729ab2d24decabcc4a682f4157f9cf78a08b/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L26-L29
 */
export const GMP_ABI = [
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

/**
 * Searches for GMP transactions in AxelarScan by destination address.
 * @param {string} destinationAddress - The destination account identifier in CAIP-10 format (e.g., 'protocol:chain:address')
 * @param {string} axelarApiUrl - The Axelar API URL
 * @param {typeof fetch} fetch - Fetch function
 * @returns {Promise<Array<SearchGMPResponseData>>} Array of matching GMP transactions from AxelarScan
 */
const findTxInAxelarScan = harden(
  async (destinationAddress, axelarApiUrl, fetch) => {
    return fetchAllPaginated(
      `${axelarApiUrl}/gmp/searchGMP`,
      (size, from) => ({
        transfersType: 'gmp',
        address: destinationAddress,
        size,
        from,
      }),
      fetch,
    );
  },
);

/**
 * Finds the status of a GMP transaction from AxelarScan by its txId and destination address.
 * @param {TxId} txId - The transaction ID to search for
 * @param {`0x${string}`} destinationAddress - The destination address on the EVM chain
 * @param {{ axelarApiUrl: string; fetch: typeof fetch }} config - Configuration object containing Axelar API URL and fetch function
 * @returns {Promise<{ status: GMPTxStatus | undefined; errorMessage?: string }>} The status and optional error message of the GMP transaction
 */
export const findTxStatusFromAxelarscan = async (
  txId: TxId,
  destinationAddress: `0x${string}`,
  config: { axelarApiUrl: string; fetch: typeof fetch },
): Promise<{ status: GMPTxStatus | undefined; errorMessage?: string }> => {
  // XXX: Add a `from` timestamp to avoid fetching too much data
  const foundTxs = await findTxInAxelarScan(
    destinationAddress,
    config.axelarApiUrl,
    config.fetch,
  );

  const txInAxelarScan = foundTxs.find(tx => {
    const gmpData = tx.call.returnValues.payload;

    const decodedGmpData = decodeAbiParameters(
      GMP_ABI,
      gmpData as `0x${string}`,
    ) as [{ id: string }];

    if (decodedGmpData[0].id === txId) {
      return true;
    }
    return false;
  });

  const status = txInAxelarScan?.status;
  const errorMessage =
    status === 'error' ? txInAxelarScan?.error?.error?.message : undefined;

  return { status, errorMessage };
};
