#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */

// Adapted from https://gist.github.com/0xpatrickdev/56e91f6318352832efa0977cfd98d188/550b9d70e5a859d25f43c0080c5ca6dd126d205a
const formatUSDC = x => Number(x) / 1_000_000;

// copied from chrome network tools. manually changed pageSize to 50
const txsQueryBody = {
  query: `
    query TransactionsQuery(
      $after: Cursor
      $pageSize: Int
      $statusFilter: FastUsdcTransactionStatus
      $orderBy: [FastUsdcTransactionsOrderBy!]
    ) {
      _metadata {
        lastProcessedHeight
        indexerHealthy
        lastProcessedTimestamp
      }
      fastUsdcTransactions(
        first: $pageSize
        after: $after
        orderBy: $orderBy
        filter: { status: { equalTo: $statusFilter } }
      ) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            id
            sourceAddress
            eud
            usdcAmount
            status
            statusHeight
            heightObserved
            heightAdvanced
            heightDisbursed
            contractFee
            poolFee
            sourceBlockTimestamp
            timeObserved
            timeAdvanced
            timeDisbursed
            risksIdentified
            sourceChainId
          }
        }
      }
    }
  `,
  variables: {
    after: '',
    pageSize: 50,
    orderBy: ['TIME_OBSERVED_DESC'],
    statusFilter: 'FORWARD_FAILED',
  },
  operationName: 'TransactionsQuery',
};

const run = async () => {
  const txsRes = await fetch(
    'https://api.subquery.network/sq/agoric-labs/internal',
    {
      headers: {
        accept: 'application/graphql-response+json, application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(txsQueryBody),
      method: 'POST',
    },
  );
  if (txsRes.status !== 200)
    throw Error(`Got status code ${txsRes.status} for Subquery`);

  const { data } = await txsRes.json();
  console.log('data', data);

  const { totalCount, edges } = data.fastUsdcTransactions;
  console.log(`Found ${totalCount} FORWARD_FAILED transactions.`);

  const amounts = edges.map(e => BigInt(e.node.usdcAmount));
  console.log('amounts', amounts);
  console.log('$ amounts', amounts.map(formatUSDC));
  const totalAmount = edges.reduce(
    (acc, e) => acc + BigInt(e.node.usdcAmount),
    0n,
  );
  console.log(
    `Totaling ${totalAmount} usdcAmount (${formatUSDC(totalAmount)}).`,
  );

  const settlementAccount =
    'agoric1j9l00dxy08zqr53unr8kkk54n0lllgvfxrmfh43hp5p67el34lkq0hhxdt';
  const usdcDenom =
    'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9';
  const rpcUrl = 'https://main.api.agoric.net';
  const balanceQueryPath = `/cosmos/bank/v1beta1/balances/`;

  const balanceQueryRes = await fetch(
    `${rpcUrl}${balanceQueryPath}${settlementAccount}`,
  );

  if (balanceQueryRes.status !== 200)
    throw Error(`Got status code ${balanceQueryRes.status} for Balance Query`);

  const { balances } = await balanceQueryRes.json();
  const usdcBalance = BigInt(balances.find(x => x.denom === usdcDenom)?.amount);
  console.log(
    `Settlement Account has ${usdcBalance} USDC (${formatUSDC(usdcBalance)}).`,
  );

  const remaining = usdcBalance - totalAmount;

  console.log(
    `Repaying ${totalCount} transactions for (${formatUSDC(totalAmount)}) would result in ${remaining} (${formatUSDC(remaining)}) left in the Settlement Account`,
  );

  const pollMetricsFetch = await fetch(
    'https://main-a.rpc.agoric.net/abci_query?path=%22/agoric.vstorage.Query/Data%22&data=0x0a1e7075626c69736865642e66617374557364632e706f6f6c4d657472696373&height=0',
    {
      headers: { accept: '*/*' },
      method: 'GET',
    },
  );
  if (pollMetricsFetch.status !== 200)
    throw Error(
      `Got status code ${pollMetricsFetch.status} for Pool Metrics Query`,
    );
  const { result } = await pollMetricsFetch.json();
  if (result?.response?.code !== 0) throw Error(`Did not get code 0 ${result}`);
  const fromB64 = atob(result.response.value);
  // avoid parsing cap data here
  const matches = fromB64.match(/encumberedBalance.*?(\d{10,})/);
  if (!matches || matches.length < 2) {
    throw new Error(`Unable to parse encumbered balance from ${fromB64}`);
  }
  const encumberedBalance = BigInt(matches[1]);
  console.log(
    'encumberedBalance',
    encumberedBalance,
    formatUSDC(encumberedBalance),
  );
  const encumberedAfter = encumberedBalance - totalAmount;
  console.log(
    `Repaying ${totalAmount} (${formatUSDC(totalAmount)}) would result in ${encumberedAfter} ${formatUSDC(encumberedAfter)} encumbered balance`,
  );
  if (encumberedAfter < 0n) {
    console.warn(
      `🚨 encumberedAfter is negative ${encumberedAfter} ${formatUSDC(encumberedAfter)}`,
    );
  }
};

run().then(console.log).catch(console.error);
