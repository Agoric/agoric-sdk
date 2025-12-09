import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { decodeAbiParameters } from 'viem';

/**
 * Status values returned by AxelarScan for GMP transactions.
 * @see https://docs.axelarscan.io/gmp#searchGMP
 */
export const AXELAR_SCAN_TX_STATUS = {
  error: 'error',
  confirming: 'confirming',
  express_executed: 'express_executed',
  approving: 'approving',
  approved: 'approved',
  executing: 'executing',
  executed: 'executed',
  waiting_for_route_message: 'waiting_for_route_message',
  waiting_for_ibc: 'waiting_for_ibc',
  insufficient_fee: 'insufficient_fee',
};

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

// Using a simplified version of the response from https://docs.axelarscan.io/gmp#searchGMP
type GmpSearchItem = {
  call: {
    returnValues: {
      payload: `0x${string}`;
    };
  };
  status: keyof typeof AXELAR_SCAN_TX_STATUS;
};

type GmpSearchResponse = {
  data: Array<GmpSearchItem>;
  total: number;
};

/**
 * Fetches all paginated data from an API endpoint by making multiple requests.
 * @param {string} url - The API endpoint URL
 * @param {function(number, number): object} getRequestBody - Function that generates request body given pageSize and offset
 * @param {typeof fetch} fetch - Fetch function
 * @param {number} [pageSize=25] - Number of items to fetch per page
 * @returns {Promise<Array<GmpSearchItem>>} Array containing all fetched data across all pages
 */
export const fetchAllPaginated = harden(
  async (url, getRequestBody, fetch, pageSize = 25) => {
    const allData: GmpSearchItem[] = [];
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

      const result: GmpSearchResponse = await response.json();
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
 * @returns {Promise<Array<GmpSearchItem>>} Array of matching GMP transactions from AxelarScan
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
 * @returns {Promise<keyof typeof AXELAR_SCAN_TX_STATUS | undefined>} The status of the GMP transaction if found, otherwise undefined
 */
export const findTxStatusFromAxelarscan = async (
  txId: TxId,
  destinationAddress: `0x${string}`,
  config: { axelarApiUrl: string; fetch: typeof fetch },
): Promise<keyof typeof AXELAR_SCAN_TX_STATUS | undefined> => {
  const foundTxs = await findTxInAxelarScan(
    destinationAddress,
    config.axelarApiUrl,
    config.fetch,
  );

  const txInAxelarScan = foundTxs.find(tx => {
    const gmpData = tx.call.returnValues.payload;

    const decodedGmpData = decodeAbiParameters(GMP_ABI, gmpData) as [
      { id: string },
    ];

    if (decodedGmpData[0].id === txId) {
      return true;
    }
    return false;
  });

  return txInAxelarScan?.status;
};
