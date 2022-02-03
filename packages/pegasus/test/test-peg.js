import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';
import { E } from '@agoric/eventual-send';
import {
  makeNetworkProtocol,
  makeLoopbackProtocolHandler,
} from '@agoric/swingset-vat/src/vats/network/index.js';

import bundleSource from '@endo/bundle-source';
import { AmountMath } from '@agoric/ertp';
import { makeZoeKit } from '@agoric/zoe';

import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { Far } from '@endo/marshal';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractPath = `${dirname}/../src/pegasus.js`;

/**
 * @param {import('tape-promise/tape').Test} t
 */
async function testRemotePeg(t) {
  t.plan(13);

  /**
   * @type {import('@agoric/ertp').DepositFacet?}
   */
  let localDepositFacet;
  const fakeBoard = Far('fakeBoard', {
    getValue(id) {
      if (id === '0x1234') {
        return localDepositFacet;
      }
      t.is(id, 'agoric1234567', 'tried bech32 first in board');
      throw Error(`unrecognized board id ${id}`);
    },
  });
  const fakeNamesByAddress = Far('fakeNamesByAddress', {
    lookup(...keys) {
      t.is(keys[0], 'agoric1234567', 'unrecognized fakeNamesByAddress');
      t.is(keys[1], 'depositFacet', 'lookup not for the depositFacet');
      t.is(keys.length, 2);
      return localDepositFacet;
    },
  });

  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // Pack the contract.
  const contractBundle = await bundleSource(contractPath);
  const installationHandle = await E(zoe).install(contractBundle);

  const { publicFacet: publicAPI } = await E(zoe).startInstance(
    installationHandle,
    {},
    { board: fakeBoard, namesByAddress: fakeNamesByAddress },
  );

  /**
   * @type {import('../src/pegasus').Pegasus}
   */
  const pegasus = publicAPI;
  const network = makeNetworkProtocol(makeLoopbackProtocolHandler());

  const portP = E(network).bind('/ibc-channel/chanabc/ibc-port/portdef');
  const portName = await E(portP).getLocalAddress();

  /**
   * Pretend we're Gaia.
   *
   * @type {import('@agoric/swingset-vat/src/vats/network').Connection?}
   */
  let gaiaConnection;
  E(portP).addListener(
    Far('acceptor', {
      async onAccept(_p, _localAddr, _remoteAddr) {
        return harden({
          async onOpen(c) {
            gaiaConnection = c;
          },
          async onReceive(_c, packetBytes) {
            const packet = JSON.parse(packetBytes);
            t.deepEqual(
              packet,
              {
                amount: '100000000000000000001',
                denom: 'uatom',
                receiver: 'markaccount',
              },
              'expected transfer packet',
            );
            return JSON.stringify({ success: true });
          },
        });
      },
    }),
  );

  // Pretend we're Agoric.
  const chandler = E(pegasus).makePegConnectionHandler();
  const connP = E(portP).connect(portName, chandler);

  const pegP = await E(pegasus).pegRemote('Gaia', connP, 'uatom');
  const localBrand = await E(pegP).getLocalBrand();
  const localIssuer = await E(pegasus).getLocalIssuer(localBrand);

  const localPurseP = E(localIssuer).makeEmptyPurse();
  localDepositFacet = await E(localPurseP).getDepositFacet();

  // Get some local Atoms.
  const sendPacket = {
    amount: '100000000000000000001',
    denom: 'uatom',
    receiver: '0x1234',
    sender: 'FIXME:sender',
  };

  const sendAckData = await E(gaiaConnection).send(JSON.stringify(sendPacket));
  const sendAck = JSON.parse(sendAckData);
  t.deepEqual(sendAck, { success: true }, 'Gaia sent the atoms');
  if (!sendAck.success) {
    console.log(sendAckData, sendAck.error);
  }

  const localAtomsAmount = await E(localPurseP).getCurrentAmount();
  t.deepEqual(
    localAtomsAmount,
    { brand: localBrand, value: 100000000000000000001n },
    'we received the shadow atoms',
  );

  const sendPacket2 = {
    amount: '170',
    denom: 'uatom',
    receiver: 'agoric1234567',
    sender: 'FIXME:sender2',
  };

  const sendAckData2 = await E(gaiaConnection).send(
    JSON.stringify(sendPacket2),
  );
  const sendAck2 = JSON.parse(sendAckData2);
  t.deepEqual(sendAck2, { success: true }, 'Gaia sent more atoms');
  if (!sendAck2.success) {
    console.log(sendAckData2, sendAck2.error);
  }

  const localAtomsAmount2 = await E(localPurseP).getCurrentAmount();
  t.deepEqual(
    localAtomsAmount2,
    { brand: localBrand, value: 100000000000000000171n },
    'we received more shadow atoms',
  );

  const localAtoms = await E(localPurseP).withdraw(localAtomsAmount);

  const allegedName = await E(pegP).getAllegedName();
  t.is(allegedName, 'Gaia', 'alleged peg name is equal');
  const transferInvitation = await E(pegasus).makeInvitationToTransfer(
    pegP,
    'markaccount',
  );
  const seat = await E(zoe).offer(
    transferInvitation,
    harden({
      give: { Transfer: localAtomsAmount },
    }),
    harden({ Transfer: localAtoms }),
  );
  const outcome = await seat.getOfferResult();
  t.is(outcome, undefined, 'transfer is successful');

  const paymentPs = await seat.getPayouts();
  const refundAmount = await E(localIssuer).getAmountOf(paymentPs.Transfer);

  const isEmptyRefund = AmountMath.isEmpty(refundAmount, localBrand);
  t.assert(isEmptyRefund, 'no refund from success');

  const stillIsLive = await E(localIssuer).isLive(localAtoms);
  t.assert(!stillIsLive, 'payment is consumed');
}

test('remote peg', t =>
  testRemotePeg(t).catch(err => t.not(err, err, 'unexpected exception')));
