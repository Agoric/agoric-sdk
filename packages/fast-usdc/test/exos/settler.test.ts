import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { IBCChannelID } from '@agoric/vats';
import type { Denom } from '@agoric/orchestration';
import { TxStatus } from '../../src/constants.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { prepareSettler } from '../../src/exos/settler.js';

import { provideDurableZone } from '../supports.js';
import { MockCctpTxEvidences, MockVTransferEvents } from '../fixtures.js';
import type { CctpTxEvidence } from '../../src/types.js';

const test = anyTest as TestFn<{
  makeSettler: ReturnType<typeof prepareSettler>;
  statusManager: ReturnType<typeof prepareStatusManager>;
  defaultSettlerParams: {
    sourceChannel: IBCChannelID;
    remoteDenom: Denom;
  };
  simulateObserveAndAdvance: (evidence?: CctpTxEvidence) => {
    cctpTxEvidence: CctpTxEvidence;
    /** array index from `${fwdAddr}-${amount}` entries */
    index: number;
  };
}>;

test.before(t => {
  const zone = provideDurableZone('settler-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));
  const makeSettler = prepareSettler(zone.subZone('settler'), {
    statusManager,
  });

  const defaultSettlerParams = harden({
    sourceChannel:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel
        .counterPartyChannelId,
    remoteDenom: 'uusdc',
  });

  const simulateObserveAndAdvance = (evidence: CctpTxEvidence) => {
    const cctpTxEvidence: CctpTxEvidence = {
      ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
      ...evidence,
    };
    t.log('Mock CCTP Evidence:', cctpTxEvidence);
    t.log('Simulate `OBSERVE` via StatusManager');
    const index = statusManager.observe(MockCctpTxEvidences.AGORIC_PLUS_OSMO());
    t.log('Pretend we initiated advance, mark as `ADVANCED`');
    statusManager.advance(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
      index,
    );

    return { cctpTxEvidence, index };
  };

  t.context = {
    makeSettler,
    statusManager,
    defaultSettlerParams,
    simulateObserveAndAdvance,
  };
});

test('StatusManger gets `SETTLED` update in happy path', async t => {
  const {
    makeSettler,
    statusManager,
    defaultSettlerParams,
    simulateObserveAndAdvance,
  } = t.context;
  const settler = makeSettler(defaultSettlerParams);

  const { cctpTxEvidence, index } = simulateObserveAndAdvance();

  t.log('Simulate incoming settlement transfer');
  void settler.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());

  t.log('TODO test funds settled in right places');
  // TODO, test settlement of funds

  const entry = statusManager.view(
    cctpTxEvidence.tx.forwardingAddress,
    cctpTxEvidence.tx.amount,
    index,
  );
  t.is(
    entry?.status,
    TxStatus.SETTLED,
    'StatusManger entry updated with SETTLED status',
  );
});

test.todo("StatusManager does not receive update when we can't settle");

test.todo('settler disperses funds');
