import { test } from 'tape-promise/tape';
import { makeChannels } from '../../../src/kernel/commsSlots/state/makeChannels';

test('channels add and get', t => {
  const channels = makeChannels();
  channels.add('machine1', 'channel1'); // we assume that machines and channels are one to one.
  const channel = channels.getChannelDevice('machine1');
  t.equal(channel, 'channel1');
  t.end();
});
