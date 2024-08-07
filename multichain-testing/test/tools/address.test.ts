import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { parseRemoteAddress, parseLocalAddress } from '../../tools/address.js';

const test = anyTest as TestFn<Record<string, never>>;

test('parseRemoteAddress correctly parses a remote IBC address', t => {
  const remoteAddress =
    '/ibc-hop/connection-0/ibc-port/icahost/ordered/{"version":"ics27-1","controller_connection_id":"connection-0","host_connection_id":"connection-1","address":"cosmos1wrz3ltf3k6leg39t353qmj5xk5gfpf4wh5mtw7mqcrw2k2072j2sud9rhl","encoding":"proto3","tx_type":"sdk_multi_msg"}/ibc-channel/channel-2';

  const result = parseRemoteAddress(remoteAddress);

  t.deepEqual(result, {
    rConnectionID: 'connection-1',
    rPortID: 'icahost',
    rChannelID: 'channel-2',
  });
});

test('parseLocalAddress correctly parses a local IBC address', t => {
  const localAddress =
    '/ibc-port/icacontroller-3/ordered/{"version":"ics27-1","controller_connection_id":"connection-0","host_connection_id":"connection-1","address":"cosmos1wrz3ltf3k6leg39t353qmj5xk5gfpf4wh5mtw7mqcrw2k2072j2sud9rhl","encoding":"proto3","tx_type":"sdk_multi_msg"}/ibc-channel/channel-4';

  const result = parseLocalAddress(localAddress);

  t.deepEqual(result, {
    lConnectionID: 'connection-0',
    lPortID: 'icacontroller-3',
    lChannelID: 'channel-4',
  });
});
