// @ts-check
/// <reference types="ses"/>
/* eslint-disable no-await-in-loop, no-continue, @jessie.js/no-nested-await */

import { E, Far } from '@endo/far';
import * as tendermintRpcStar from '@cosmjs/tendermint-rpc';
import * as stargateStar from '@cosmjs/stargate';

import { MAKE_DEFAULT_DECODER, MAKE_DEFAULT_UNSERIALIZER } from './defaults.js';
import { makeCastingSpec } from './casting-spec.js';
import { makeLeader as defaultMakeLeader } from './leader-netconfig.js';

const { QueryClient } = stargateStar;
const { Tendermint34Client } = tendermintRpcStar;
const { details: X, quote: q } = assert;
const textDecoder = new TextDecoder();

/** @template T @typedef {import('./types.js').StreamCell<T>} StreamCell */
/** @template T @typedef {import('./types.js').ValueFollowerElement<T>} ValueFollowerElement */
/** @template T @typedef {import('./types.js').Follower<ValueFollowerElement<T>>} ValueFollower */

/**
 * This is an imperfect heuristic to navigate the migration from value cells to
 * stream cells.
 * At time of writing, no legacy cells have the same shape as a stream cell,
 * and we do not intend to create any more legacy value cells.
 *
 * @param {any} cell
 */
const isStreamCell = cell =>
  cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
const arrayEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const defaultDataPrefixBytes = new Uint8Array();

/**
 * @template T
 * @param {Iterable<T>} values
 * @returns {T}
 */
const collectSingle = values => {
  /** @type {T[]} */
  const head = [];
  let count = 0;
  for (const value of values) {
    count += 1;
    if (count === 1) {
      head.push(value);
    } else {
      assert.fail(`expected single value, got at least ${count}`);
    }
  }

  assert.equal(head.length, 1, 'expected single value');
  return head[0];
};

// Coordinate with switch/case of tryGetData.
const proofs = ['strict', 'none', 'optimistic'];

/**
 * @template T
 * @param {any} sourceP
 * @param {import('./types').LeaderOrMaker} [leaderOrMaker]
 * @param {import('./types').FollowerOptions} [options]
 * @returns {ValueFollower<T>}
 */
export const makeCosmjsFollower = (
  sourceP,
  leaderOrMaker = defaultMakeLeader,
  options = {},
) => {
  const {
    decode = MAKE_DEFAULT_DECODER(),
    unserializer = MAKE_DEFAULT_UNSERIALIZER(),
    proof = 'optimistic',
    crasher = null,
  } = options;

  /**
   * @param {any} err
   */
  const crash = err => {
    if (crasher) {
      E(crasher)
        .crash(`PROOF VERIFICATION FAILURE; crashing follower`, err)
        .catch(e => assert.fail(X`crashing follower failed: ${e}`));
    }
    throw err;
  };

  assert(proofs.includes(proof), X`unrecognized follower proof mode ${proof}`);

  const where = 'CosmJS follower';
  const castingSpecP = makeCastingSpec(sourceP);

  const leader =
    typeof leaderOrMaker === 'function' ? leaderOrMaker() : leaderOrMaker;

  const tendermintClientPs = new Map();
  /**
   * @param {string} endpoint
   * @returns {tendermintRpcStar.Tendermint34Client}
   */
  const provideTendermintClient = endpoint => {
    let clientP = tendermintClientPs.get(endpoint);
    if (!clientP) {
      clientP = Tendermint34Client.connect(endpoint);
      tendermintClientPs.set(endpoint, clientP);
    }
    return clientP;
  };

  const getBlockHeight = async () => {
    const values = await E(leader).mapEndpoints(where, async endpoint => {
      const client = await provideTendermintClient(endpoint);
      const info = await client.abciInfo();
      const { lastBlockHeight } = info;
      assert.typeof(lastBlockHeight, 'number');
      return { blockHeight: lastBlockHeight, endpoint };
    });
    return collectSingle(values);
  };

  /** @type {Map<string, import('@cosmjs/stargate').QueryClient>} */
  const endpointToQueryClient = new Map();

  /**
   * @param {string} endpoint
   */
  const provideQueryClient = async endpoint => {
    if (endpointToQueryClient.has(endpoint)) {
      // Cache hit.
      const queryClient = endpointToQueryClient.get(endpoint);
      assert(queryClient);
      return queryClient;
    }
    // Create a new client.  They retry automatically.
    const rpcClient = await provideTendermintClient(endpoint);
    const queryClient = QueryClient.withExtensions(rpcClient);
    endpointToQueryClient.set(endpoint, queryClient);
    return queryClient;
  };

  /**
   * @param {(endpoint: string, storeName: string, storeSubkey: Uint8Array) => Promise<Uint8Array>} tryGetPrefixedData
   * @param {string} [specificEndpoint]
   * @returns {Promise<{data: Uint8Array, endpoint: string}>}
   */
  const retryGetDataAndStripPrefix = async (
    tryGetPrefixedData,
    specificEndpoint,
  ) => {
    const {
      storeName,
      storeSubkey,
      dataPrefixBytes = defaultDataPrefixBytes,
    } = await castingSpecP;

    assert.typeof(
      storeName,
      'string',
      X`storeName must be a string, got ${storeName}`,
    );
    assert(
      storeSubkey,
      X`storeSubkey must be a Uint8Array, got ${storeSubkey}`,
    );

    let data;
    let endpoint;
    if (specificEndpoint !== undefined) {
      endpoint = specificEndpoint;
      data = await tryGetPrefixedData(endpoint, storeName, storeSubkey);
    } else {
      // mapEndpoints is our retry loop.
      const values = await E(leader).mapEndpoints(where, async chosenEndpoint =>
        tryGetPrefixedData(chosenEndpoint, storeName, storeSubkey).then(
          result => {
            return { result, error: null, endpoint: chosenEndpoint };
          },
          error => {
            return { result: null, error, endpoint: chosenEndpoint };
          },
        ),
      );

      let error = null;
      ({ result: data, error, endpoint } = collectSingle(values));
      if (error !== null) {
        throw error;
      }
      assert(data);
    }

    if (data.length === 0) {
      // No data.
      return {
        endpoint,
        data,
      };
    }

    // Handle the data prefix if any.
    assert(
      data.length >= dataPrefixBytes.length,
      X`data too short for data prefix ${dataPrefixBytes}`,
    );
    assert(
      arrayEqual(data.subarray(0, dataPrefixBytes.length), dataPrefixBytes),
      X`${data} doesn't start with data prefix ${dataPrefixBytes}`,
    );

    return {
      endpoint,
      data: data.slice(dataPrefixBytes.length),
    };
  };

  /**
   * @param {object} params
   * @param {number} [params.blockHeight]
   * @param {string} [params.endpoint]
   * @returns {Promise<{ data: Uint8Array, endpoint: string }>}
   */
  const getProvenData = async ({ blockHeight, endpoint: specificEndpoint }) => {
    return retryGetDataAndStripPrefix(
      async (endpoint, storeName, storeSubkey) => {
        const queryClient = await provideQueryClient(endpoint);
        return E(queryClient).queryVerified(
          storeName,
          storeSubkey,
          blockHeight,
        );
      },
      specificEndpoint,
    );
  };

  /**
   * @param {object} params
   * @param {number} [params.blockHeight]
   * @param {string} [params.endpoint]
   * @returns {Promise<{data: Uint8Array, endpoint: string}>}
   */
  const getUnprovenData = async ({
    blockHeight,
    endpoint: specificEndpoint,
  }) => {
    return retryGetDataAndStripPrefix(
      async (endpoint, storeName, storeSubkey) => {
        const client = await provideTendermintClient(endpoint);
        const response = await client.abciQuery({
          path: `store/${storeName}/key`,
          data: storeSubkey,
          height: blockHeight,
          prove: false,
        });
        if (response.code !== 0) {
          throw new Error(`Tendermint ABCI query failed: ${response.log}`);
        }
        const { value } = response;
        return value;
      },
      specificEndpoint,
    );
  };

  /**
   * @param {object} params
   * @param {number} [params.blockHeight]
   * @param {string} [params.endpoint]
   * @returns {Promise<{ data: Uint8Array, endpoint: string }>}
   */
  const tryGetData = async params => {
    if (proof === 'strict') {
      // Crash hard if we can't prove.
      return getProvenData(params).catch(crash);
    } else if (proof === 'none') {
      // Fast and loose.
      return getUnprovenData(params);
    } else if (proof === 'optimistic') {
      const { data: allegedData, endpoint } = await getUnprovenData(params);

      // Prove later, since it may take time we say we can't afford.
      getProvenData(params).then(({ data: provenData }) => {
        if (arrayEqual(provenData, allegedData)) {
          return;
        }
        crash(
          assert.error(
            X`Alleged value ${allegedData} did not match proof ${provenData}`,
          ),
        );
      }, crash);

      // Speculate that we got the right value.
      return { data: allegedData, endpoint };
    }

    assert.fail(
      X`Unrecognized proof option ${q(
        proof,
      )}, must be one of strict, none, or optimistic`,
    );
  };

  /**
   * @param {object} params
   * @param {number} [params.blockHeight]
   * @param {string} [params.endpoint]
   */
  const getData = async params => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        // AWAIT
        return await tryGetData(params);
      } catch (error) {
        // We expect occasionally to see an error here if the chain has not
        // reached the requested blockHeight.
        await E(leader).retry(where, error, attempt);
        continue;
      }
    }
  };

  /**
   * @param {number} blockHeight
   * @param {Uint8Array} data
   */
  const streamCellForData = (blockHeight, data) => {
    const text = textDecoder.decode(data);
    try {
      const cell = JSON.parse(text);
      if (isStreamCell(cell)) {
        return harden({
          blockHeight: Number(cell.blockHeight),
          values: cell.values.map(decode),
        });
      }

      // This is JSON but not the shape of a stream cell.
      // Fall through...
    } catch {
      // This is not even JSON, so it must be a legacy value cell.
      // Fall through...
    }

    // Coerce legacy value cells to stream cells at their given height.
    // Since this is either the first iteration or the data varies bytewise
    // from the data on the previous block, we can assume the blockHeight is
    // the current block.
    return harden({
      blockHeight,
      values: [decode(text)],
    });
  };

  /**
   * @param {any} data
   * @param {number} blockHeight
   * @param {number} currentBlockHeight
   * @returns {Promise<ValueFollowerElement<T>>}
   */
  const followerElementFromStreamCellValue = async (
    data,
    blockHeight,
    currentBlockHeight,
  ) => {
    // AWAIT
    const value = await /** @type {T} */ (
      unserializer ? E(unserializer).unserialize(data) : data
    );
    return { value, blockHeight, currentBlockHeight };
  };

  /**
   * @param {StreamCell<T>} streamCell
   * @param {number} currentBlockHeight
   * @yields {ValueFollowerElement<T>}
   */
  function* allValuesFromCell(streamCell, currentBlockHeight) {
    for (const data of streamCell.values) {
      yield followerElementFromStreamCellValue(
        data,
        streamCell.blockHeight,
        currentBlockHeight,
      );
    }
  }

  /**
   * @param {StreamCell<T>} streamCell
   * @param {number} currentBlockHeight
   * @yields {ValueFollowerElement<T>}
   */
  function* reverseValuesFromCell(streamCell, currentBlockHeight) {
    for (let i = streamCell.values.length - 1; i >= 0; i -= 1) {
      yield followerElementFromStreamCellValue(
        streamCell.values[i],
        streamCell.blockHeight,
        currentBlockHeight,
      );
    }
  }

  /**
   * @param {StreamCell<T>} streamCell
   * @param {number} currentBlockHeight
   * @yields {ValueFollowerElement<T>}
   */
  function* lastValueFromCell(streamCell, currentBlockHeight) {
    const { values } = streamCell;
    if (values.length > 0) {
      const last = values[values.length - 1];
      yield followerElementFromStreamCellValue(
        last,
        streamCell.blockHeight,
        currentBlockHeight,
      );
    }
  }

  /**
   * @yields {ValueFollowerElement<T>}
   */
  async function* getLatestIterable() {
    let blockHeight;
    let data;
    for (;;) {
      const { blockHeight: currentBlockHeight, endpoint } =
        await getBlockHeight();
      if (currentBlockHeight === blockHeight) {
        // TODO Long-poll for next block
        // https://github.com/Agoric/agoric-sdk/issues/6154
        await E(leader).jitter(where);
        continue;
      }

      // Carry endpoint that responded with the current block height forward to
      // getData so we are sure that the endpoint has data for that height.

      const { data: currentData } = await getData({
        blockHeight: currentBlockHeight,
        endpoint,
      });
      if (currentData.length === 0) {
        // TODO Long-poll for block data change
        // https://github.com/Agoric/agoric-sdk/issues/6154
        await E(leader).jitter(where);
        continue;
      }
      const currentStreamCell = streamCellForData(
        currentBlockHeight,
        currentData,
      );

      blockHeight = currentBlockHeight;

      // Ignore adjacent duplicates.
      // This can only occur for legacy cells.
      // It is possible that the data changed from and back to the last
      // sampled data, but ignoring intermediate changes is consistent with
      // the semantics of getLatestIterable.
      if (data !== undefined && arrayEqual(data, currentData)) {
        continue;
      }
      // However, streamCells that vacillate will reemit, since each iteration
      // at a unique block height is considered distinct.

      yield* lastValueFromCell(currentStreamCell, currentBlockHeight);
      data = currentData;
    }
  }

  /**
   * @param {number} cursorBlockHeight
   * @yields {ValueFollowerElement<T>}
   */
  async function* getEachIterableAtHeight(cursorBlockHeight) {
    assert.typeof(cursorBlockHeight, 'number');
    // Track the data for the last emitted cell (the cell at the
    // cursorBlockHeight) so we know not to emit duplicates
    // of that cell.
    let cursorData;
    let cursorEndpoint;
    // Initially yield *all* the values that were most recently stored in a
    // block.
    // If the block has no corresponding data, wait for the first block to
    // contain data.
    for (;;) {
      // Endpoint is selected at end of previous iteration, and unspecified for
      // the first iteration.
      ({ data: cursorData } = await getData({
        blockHeight: cursorBlockHeight,
        endpoint: cursorEndpoint,
      }));
      if (cursorData.length !== 0) {
        const cursorStreamCell = streamCellForData(
          cursorBlockHeight,
          cursorData,
        );
        yield* allValuesFromCell(cursorStreamCell, cursorBlockHeight);
        break;
      }
      // TODO Long-poll for next block
      // https://github.com/Agoric/agoric-sdk/issues/6154
      await E(leader).jitter(where);
      ({ blockHeight: cursorBlockHeight, endpoint: cursorEndpoint } =
        await getBlockHeight());
    }

    // For each subsequent iteration, yield every value that has been
    // published since the last iteration and advance the cursor.
    for (;;) {
      const { blockHeight: currentBlockHeight, endpoint } = await getBlockHeight();
      // Wait until the chain has added at least one block.
      if (currentBlockHeight <= cursorBlockHeight) {
        // TODO Long-poll for next block
        // https://github.com/Agoric/agoric-sdk/issues/6154
        await E(leader).jitter(where);
        continue;
      }

      // Carry endpoint that responded with the current block height forward to
      // getData so we are sure that the endpoint has data for that height.

      // Scan backward for all changes since the last observed block and yield
      // them in forward order.
      // Stream cells allow us to skip blocks that did not change.
      // We walk backward through all blocks with legacy cells, only yielding
      // the value for cells that changed.
      // This does imply accumulating a potentially large number of values if
      // the eachIterable gets sampled infrequently.
      let rightBlockHeight = currentBlockHeight;
      let { data: rightData } = await getData({
        blockHeight: rightBlockHeight,
        endpoint,
      });
      if (rightData.length === 0) {
        // TODO Long-poll for next block
        // https://github.com/Agoric/agoric-sdk/issues/6154
        await E(leader).jitter(where);
        continue;
      }
      let rightStreamCell = streamCellForData(rightBlockHeight, rightData);

      // Compare block cell data pairwise (left, right) and accumulate
      // a stack of each cell we encounter.
      const currentData = rightData;
      const cells = [];
      while (rightBlockHeight > cursorBlockHeight) {
        if (rightStreamCell.blockHeight > rightBlockHeight) {
          const { storeName, storeSubkey } = await castingSpecP;
          throw new Error(
            `Corrupt storage cell for ${storeName} under key ${storeSubkey} at block-height ${rightBlockHeight} claims to being published at a later block height ${rightStreamCell.blockHeight}`,
          );
        }
        const leftBlockHeight = rightStreamCell.blockHeight - 1;
        // Do not scan behind the cusor.
        if (leftBlockHeight <= cursorBlockHeight) {
          break;
        }
        const { data: leftData } = await getData({
          blockHeight: leftBlockHeight,
          endpoint,
        });
        // Do not scan behind a cell with no data.
        // This should not happen but can be tolerated.
        if (leftData.length === 0) {
          break;
        }
        const leftStreamCell = streamCellForData(leftBlockHeight, leftData);

        // Stream cells include a block height that is guaranteed to change
        // between iterations even if the values are identical.
        // We can rely on this difference to ensure that we yield
        // every iteration, including duplicates.
        // Legacy cells do not contain a block height to distingish versions,
        // so we simply assume that the value must change between iterations
        // for a cell to be worthy of notice.
        if (!arrayEqual(leftData, rightData)) {
          cells.push(rightStreamCell);
        }

        // Prepare for next iteration by moving left to right.
        rightData = leftData;
        rightStreamCell = leftStreamCell;
        rightBlockHeight = leftBlockHeight;
      }

      // At the end of a sequence of identical value cells, we emit the value
      // only if it differs from the last reported cell.
      if (!arrayEqual(rightData, cursorData)) {
        cells.push(rightStreamCell);
      }

      // Yield collected cells in forward order.
      // They were collected by scanning blocks backward.
      for (;;) {
        const cell = cells.pop();
        if (cell === undefined) {
          break;
        }
        yield* allValuesFromCell(cell, currentBlockHeight);
      }

      // Advance the cursor.
      cursorBlockHeight = currentBlockHeight;
      cursorData = currentData;
    }
  }

  /**
   * @param {number} cursorBlockHeight
   * @yields {ValueFollowerElement<T>}
   */
  async function* getReverseIterableAtHeight(cursorBlockHeight) {
    // Track the data for the last emitted cell (the cell at the
    // cursorBlockHeight) so we know not to emit duplicates
    // of that cell.
    let cursorData;
    while (cursorBlockHeight > 0) {
      ({ data: cursorData } = await getData({
        blockHeight: cursorBlockHeight,
      }));
      if (cursorData.length === 0) {
        // No data at the cursor height, so signal beginning of stream.
        return;
      }
      const cursorStreamCell = streamCellForData(cursorBlockHeight, cursorData);
      yield* reverseValuesFromCell(cursorStreamCell, cursorBlockHeight);
      cursorBlockHeight = cursorStreamCell.blockHeight - 1;
    }
  }

  /** @type {ValueFollower<T>} */
  return Far('chain follower', {
    async getLatestIterable() {
      return getLatestIterable();
    },
    async getEachIterable({ height: blockHeight = undefined } = {}) {
      if (blockHeight === undefined) {
        ({ blockHeight } = await getBlockHeight());
      }
      return getEachIterableAtHeight(blockHeight);
    },
    async getReverseIterable({ height: blockHeight = undefined } = {}) {
      if (blockHeight === undefined) {
        ({ blockHeight } = await getBlockHeight());
      }
      return getReverseIterableAtHeight(blockHeight);
    },
  });
};
