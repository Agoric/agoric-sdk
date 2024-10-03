import test from '@endo/ses-ava/prepare-endo.js';
import { merkleTreeAPI } from '../../../src/examples/airdrop/merkle-tree/index.js';
import { agoricGenesisAccounts, pubkeys } from './data/genesis.keys.js';

// const root = testTreeAPI.generateMerkleRoot(pubkeys);

// let proofs = agoricGenesisAccounts
//   .map(x => ({
//     ...x,
//     proof: testTreeAPI.generateMerkleProof(x.pubkey.key, pubkeys),
//   }))

// test('merkleRoot generation', t => {

//     .map(({ proof, pubkey, address }) => {
//       console.log({
//         pubkey,
//         t: testTreeAPI.getMerkleRootFromMerkleProof(proof),
//       });
//       t.deepEqual(
//         testTreeAPI.getMerkleRootFromMerkleProof(proof),
//         root,
//         `root computed by proof does not equal the correct hash : address ${address}`,
//       );
//     });

//   t.log(proofs);
// });

const simulatreClaim = test.macro({
  title: (_, keys) => `testing MerkleTReeAPI`,
  exec: async (t, pubkeys) => {
    const root = merkleTreeAPI.generateMerkleRoot(pubkeys);
    t.log('testing ccounts for merkleRoot:: ', root);
    agoricGenesisAccounts
      .map(x => ({
        ...x,
        proof: merkleTreeAPI.generateMerkleProof(x.pubkey.key, pubkeys),
      }))
      .map(x => ({
        ...x,
        proof: merkleTreeAPI.generateMerkleProof(x.pubkey.key, pubkeys),
      }))
      .map(({ proof, pubkey, address }) => {
        console.log({
          pubkey,
          t: merkleTreeAPI.getMerkleRootFromMerkleProof(proof),
        });
        t.log(`testing proof for ${address}.`);
        t.deepEqual(
          merkleTreeAPI.getMerkleRootFromMerkleProof(proof),
          root,
          `root computed by proof does not equal the correct hash : address ${address}`,
        );
      });
  },
});

test.serial(simulatreClaim, pubkeys);
