#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */
/* eslint-disable @jessie.js/safe-await-separator */

/**
 * You can paste the output of this into a spreadsheet for analysis.
 * E.g. https://docs.google.com/spreadsheets/d/15CZGF-GyqfimwZgrkFTIAkp8xEfHlLQhkp83flXqI84/edit?pli=1&gid=1340327751#gid=1340327751
 */

// module
export { };

/**
 * Fetches GraphQL data, converts it to a table, and prints it as TSV.
 * @param {string} graphqlEndpoint - The GraphQL endpoint URL.
 * @param {string} query - The GraphQL query string.
 */
export async function dumpTransactions(
    graphqlEndpoint: string,
    query: string,
): Promise<void> {
    try {
        // Fetch the GraphQL response
        const response = await fetch(graphqlEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(
                `GraphQL request failed with status ${response.status}: ${response.statusText}`,
            );
        }

        const { data } = await response.json();

        if (!data) {
            throw new Error('No data received from GraphQL response');
        }

        const transactions = data.fastUsdcTransactions.edges.map(
            (edge: any) => edge.node,
        );

        // Convert the data to a table format
        const rows: string[][] = [];
        const headers = Object.keys(transactions[0]);
        rows.push(headers);

        for (const txn of transactions) {
            rows.push(headers.map(header => String(txn[header] ?? '')));
        }

        // Print the table as TSV
        for (const row of rows) {
            console.log(row.join('\t'));
        }
    } catch (error) {
        console.error('Error dumping transactions:', error);
    }
}

const graphqlEndpoint = 'https://api.subquery.network/sq/agoric-labs/internal';
const query = `
query TransactionsQuery {
    fastUsdcTransactions(orderBy: SOURCE_BLOCK_TIMESTAMP_DESC) {
      edges {
            node {
  id
  sourceAddress
  sourceChainId
  sourceBlockTimestamp
  eud
  usdcAmount
  status
  statusHeight
  contractFee
  poolFee
  risksIdentified
  heightObserved
  heightAdvanced
  heightDisbursed
  timeObserved
  timeAdvanced
  timeDisbursed
        }
      }
    }
  }
`;

dumpTransactions(graphqlEndpoint, query).catch(err => {
    console.error('Unhandled error:', err);
});
