import { test } from 'tape-promise/tape';
import { makeMachineState } from '../../../src/kernel/commsSlots/state/makeMachineState';

test('machineState set and get', t => {
  const machineState = makeMachineState();
  t.equal(machineState.getMachineName(), undefined);
  t.equal(machineState.getProofMaterial(), undefined);
  machineState.setMachineName('alice');
  machineState.setProofMaterial('proof');
  t.equal(machineState.getMachineName(), 'alice');
  t.equal(machineState.getProofMaterial(), 'proof');

  // test that it creates a new instance
  const otherMachineState = makeMachineState();
  t.equal(otherMachineState.getMachineName(), undefined);
  t.equal(otherMachineState.getProofMaterial(), undefined);
  otherMachineState.setMachineName('alice');
  otherMachineState.setProofMaterial('proof');
  t.equal(otherMachineState.getMachineName(), 'alice');
  t.equal(otherMachineState.getProofMaterial(), 'proof');
  t.end();
});
