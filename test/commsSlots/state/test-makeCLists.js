import { test } from 'tape-promise/tape';
import { makeCLists } from '../../../src/kernel/commsSlots/state/makeCLists';

test('Clists add and get', t => {
  const clists = makeCLists();
  const kernelToMeSlot = { type: 'export', id: 1 };
  const youToMeSlot = { type: 'your-ingress', id: 102 };
  const meToYouSlot = clists.changePerspective(youToMeSlot);
  clists.add('machine0', kernelToMeSlot, youToMeSlot, meToYouSlot);
  const actualKernelToMeSlot = clists.mapIncomingWireMessageToKernelSlot(
    'machine0',
    youToMeSlot,
  );
  t.deepEqual(actualKernelToMeSlot, kernelToMeSlot);
  const {
    meToYouSlot: actualMeToYouSlot,
  } = clists.mapKernelSlotToOutgoingWireMessage(kernelToMeSlot);
  t.equal(actualMeToYouSlot, meToYouSlot);
  t.end();
});
