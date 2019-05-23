import { test } from 'tape-promise/tape';
import { makeChannels } from '../../../src/kernel/commsSlots/state/channels';

test('channels set and get', t => {
  const channels = makeChannels();
  const dev1 = { type: 'device', index: 1 };
  channels.setChannelDevice(dev1);
  const channelDev = channels.getChannelDevice();
  t.deepEqual(channelDev, dev1);
  t.end();
});
