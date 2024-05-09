// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { addParamsIfJsonVersion } from '../../../tools/ibc/mocks.js';

test('addParamsToVersion', t => {
  const params = { address: 'cosmos1234' };
  const scenarios = [
    {
      version:
        '{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"","encoding":"proto3","txType":"sdk_multi_msg"}',
      expected:
        '{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-1","address":"cosmos1234","encoding":"proto3","txType":"sdk_multi_msg"}',
      message: 'ICA: add mock negotiated address to version string',
    },
    {
      version: 'ics20-1',
      expected: 'ics20-1',
      message: 'preserves existing transfer version',
    },
    {
      version: 'icq-1',
      expected: 'icq-1',
      message: 'preserves existing query version',
    },
  ];

  for (const { version, expected, message } of scenarios) {
    t.is(addParamsIfJsonVersion(version, params), expected, message);
  }
});
