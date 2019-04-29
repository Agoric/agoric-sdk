import { test } from 'tape-promise/tape';
import { makeCLists } from '../../../src/kernel/commsSlots/state/makeCLists';

test('Clists add and get', t => {
  const clists = makeCLists();
  clists.add('inbound', 'machine0', 'key0', 'value0');
  const value = clists.getKernelExport('inbound', 'machine0', 'key0');
  t.equal(value, 'value0');
  const machineInfo = clists.getMachine('inbound', 'value0');
  t.equal(machineInfo.machineName, 'machine0');
  t.end();
});
