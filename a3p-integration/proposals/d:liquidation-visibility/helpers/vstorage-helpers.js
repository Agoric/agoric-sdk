#! /usr/local/bin/node
import { getContractInfo, agoric, agd } from "@agoric/synthetic-chain";

/**
 * @file A helper tool for displaying data from vstorage.
 * Especially for the kind = 'data' where unmarshalling is required.
 */

const [,,kind, path, interestedProperty] = process.argv;

if (kind === 'data') {
  const result = await getContractInfo(path, { agoric, prefix: '' });
  console.log('Data: ');
  console.log(result);

  if (interestedProperty) {
    console.log('Here is the property you are interested: ');
    console.log(result.current[interestedProperty]);
  }
} else if (kind === 'children') {
  const children = await agd.query('vstorage', kind, path);
  console.log('Children: ');
  console.log(children);
} else {
  console.log('ERROR: Unknown kind');
}


