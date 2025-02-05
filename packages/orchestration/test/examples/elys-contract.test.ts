import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { heapVowE as VE } from '@agoric/vow/vat.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { Nat } from '@endo/nat';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { ChainAddressShape } from '../../src/typeGuards.js';
import { buildVTransferEvent } from '../../tools/ibc-mocks.js';
import { commonSetup } from '../supports.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'elysStrideContract';
const contractFile = nodeRequire.resolve('../../src/examples/elys-contract.js');
type StartFn = typeof import('../../src/examples/elys-contract.js').start;

test('start Elys-stride contract', async t => {
  const common = await commonSetup(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const myContract = await E(zoe).startInstance(
    installation,
    {}, // issuers
    {}, // terms
    common.commonPrivateArgs,
  );
  t.notThrows(() =>
    mustMatch(
        myContract,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
      }),
    ),
  );

  const agorichookAddress = await E(myContract.publicFacet).getLocalAddress();
  t.log('agorichookAddress', agorichookAddress);

//   t.notThrows(() => mustMatch(agorichookAddress, ChainAddressShape));
//   // By this time, agoric contract is ready to accept the deposit request from all the remote chains

//   // transfer Atom from cosmoshub to agoric chain
//   const { transferBridge } = common.mocks;
//   const deposit = async (coins: CoinSDKType) => {
//     await VE(transferBridge).fromBridge(
//       buildVTransferEvent({
//         receiver: agorichookAddress.value,
//         target: agorichookAddress.value,
//         sourceChannel: 'channel-405',
//         denom: coins.denom,
//         amount: Nat(BigInt(coins.amount)),
//         sender: 'cosmos1p3ucd3ptpw902fluyjzhq3ffgq4ntddac9sa3s',
//       }),
//     );
//     await eventLoopIteration();
//   };

//   await t.notThrowsAsync(deposit({ amount: '10000000', denom: 'uatom' }));

//  Transferd the atom from the cosmoshub too agoric contract address
//  TODO: Test the contract logic
});
