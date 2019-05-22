import { test } from 'tape-promise/tape';
import { makeMachineState } from '../../../src/kernel/commsSlots/state/makeMachineState';

test('machineState set and get', t => {
  const machineState = makeMachineState();
  t.equal(machineState.getVatTP(), undefined);
  machineState.setVatTP('fake-vattp');
  t.equal(machineState.getVatTP(), 'fake-vattp');

  // test that it creates a new instance
  const otherMachineState = makeMachineState();
  t.equal(otherMachineState.getVatTP(), undefined);
  otherMachineState.setVatTP('other-fake-vattp');
  t.equal(otherMachineState.getVatTP(), 'other-fake-vattp');
  t.end();
});
