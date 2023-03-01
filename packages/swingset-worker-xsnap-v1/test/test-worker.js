import test from 'ava';
import '@endo/init/debug.js';

import { spawn } from 'child_process';
import bundleSource from '@endo/bundle-source';
import { makeMarshal } from '@endo/marshal';
import { Fail } from '@agoric/assert';
import { makeStartXSnapV1 } from '../src/index.js';

const nope = () => Fail`nope`;
const kmarshal = makeMarshal(nope, nope, {
  serializeBodyFormat: 'smallcaps',
  errorTagging: 'off',
});
const kser = value => kmarshal.serialize(harden(value));
const kunser = value => kmarshal.unserialize(value);

test('basic delivery', async t => {
  const fn = new URL('./vat-simple.js', import.meta.url).pathname;
  const bundle = await bundleSource(fn, { dev: true });

  const snapStore = /** @type {SnapStore} */ undefined;
  const startXSnapV1 = makeStartXSnapV1({
    snapStore, // unused by this test
    spawn,
  });

  const vatstore = new Map();
  const resolutions = new Map();

  const vatID = 'v1';
  const argName = 'v1-name';
  function handleUpstream(body) {
    if (body[0] === 'syscall') {
      let result;
      const vso = body[1];
      if (vso[0] === 'vatstoreGet') {
        result = vatstore.get(vso[1]);
      } else if (vso[0] === 'vatstoreSet') {
        vatstore.set(vso[1], vso[2]);
      } else if (vso[0] === 'vatstoreGetNextKey') {
        if (vso[1] === 'vom.dkind.') {
          // liveslots is looking for KindHandles from a previous version
          result = undefined; // tell it there are none
        } else {
          console.log(`unhandled vatstoreGetNextKey`, vso);
          throw Error('unhandled vatstoreGetNextKey');
        }
      } else if (vso[0] === 'resolve') {
        for (const [vpid, isReject, value] of vso[1]) {
          resolutions.set(vpid, [isReject, value]);
        }
      } else {
        console.log(`unhandled syscall`, vso);
        throw Error('unhandled syscall');
      }
      return ['ok', result];
    } else if (body[0] === 'sourcedConsole') {
      const [_, source, level, value] = body;
      console.log(`log: ${source} console.${level}: ${value}`);
    } else {
      console.log(`unhandled upstream`, body);
      throw Error('unhandled upstream');
    }
    return ['ok'];
  }
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  async function handleCommand(msg) {
    const tagged = handleUpstream(JSON.parse(decoder.decode(msg)));
    return encoder.encode(JSON.stringify(tagged));
  }
  const metered = false;
  const worker = await startXSnapV1(vatID, argName, handleCommand, metered);
  console.log(`-- started worker`);

  const liveSlotsOptions = {};
  const setBundle = ['setBundle', vatID, bundle, liveSlotsOptions];
  const sbResult = await worker.issueStringCommand(JSON.stringify(setBundle));
  t.deepEqual(JSON.parse(sbResult.reply), ['dispatchReady']);

  // liveslots does a bunch of vatstore operations during startVat
  const vdoStartVat = ['startVat', kser()];
  const deliverStartVat = ['deliver', vdoStartVat];
  const dResult = await worker.issueStringCommand(
    JSON.stringify(deliverStartVat),
  );
  t.deepEqual(JSON.parse(dResult.reply), ['ok', null, null]);

  const pingMethargsBody = JSON.stringify(['ping', []]);
  const vdoPing = [
    'message',
    'o+0',
    { methargs: { body: pingMethargsBody, slots: [] }, result: 'p-1' },
  ];
  const deliverPing = ['deliver', vdoPing];
  const pResult = await worker.issueStringCommand(JSON.stringify(deliverPing));
  t.deepEqual(JSON.parse(pResult.reply), ['ok', null, null]);

  t.true(resolutions.has('p-1'));
  const [isReject, value] = resolutions.get('p-1');
  t.is(isReject, false);
  t.is(kunser(value), 'pong');
});
