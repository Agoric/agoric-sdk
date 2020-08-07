/* global harden */

import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { makeDehydrator } from '../lib/lib-dehydrate';

test('makeDehydrator', async t => {
  try {
    const { hydrate, dehydrate, makeMapping } = makeDehydrator();

    const instanceHandleMapping = makeMapping('instanceHandle');
    const brandMapping = makeMapping('brand');

    const handle1 = harden({});
    const handle2 = harden({});
    const handle3 = harden({});
    instanceHandleMapping.addPetname('simpleExchange', handle1);
    instanceHandleMapping.addPetname('atomicSwap', handle2);
    instanceHandleMapping.addPetname('automaticRefund', handle3);
    console.log(`ERROR EXPECTED 'already has a petname' >>>>`);
    t.throws(
      () => instanceHandleMapping.addPetname('simpleExchange2', handle1),
      `cannot add a second petname for the same value`,
    );
    console.log(
      `ERROR EXPECTED 'petname simpleExchange is already in use' >>>>`,
    );
    t.throws(
      () => instanceHandleMapping.addPetname('simpleExchange', harden({})),
      `cannot add another value for the same petname`,
    );

    // Test renaming.
    instanceHandleMapping.renamePetname('whatever', handle1);
    t.equals(
      instanceHandleMapping.valToPetname.get(handle1),
      'whatever',
      `renaming is successful going from val to petname`,
    );
    t.deepEquals(
      instanceHandleMapping.petnameToVal.get('whatever'),
      handle1,
      `renaming is successful going from val to petname`,
    );
    console.log(
      `ERROR EXPECTED 'has not been previously named, would you like to add it instead?' >>>>`,
    );
    t.throws(
      () => instanceHandleMapping.renamePetname('new value', harden({})),
      /has not been previously named, would you like to add it instead\?/,
      `can't rename something that was never added`,
    );
    // rename it back
    instanceHandleMapping.renamePetname('simpleExchange', handle1);
    t.equals(
      instanceHandleMapping.valToPetname.get(handle1),
      'simpleExchange',
      `second renaming is successful going from val to petname`,
    );
    t.deepEquals(
      instanceHandleMapping.petnameToVal.get('simpleExchange'),
      handle1,
      `second renaming is successful going from val to petname`,
    );

    // Test deletion.
    const temp = harden({});
    instanceHandleMapping.addPetname('to be deleted', temp);
    t.equals(
      instanceHandleMapping.valToPetname.get(temp),
      'to be deleted',
      `'to be deleted' present going from val to petname`,
    );
    t.deepEquals(
      instanceHandleMapping.petnameToVal.get('to be deleted'),
      handle1,
      `'to be deleted' present going from val to petname`,
    );
    instanceHandleMapping.deletePetname('to be deleted');
    console.log(`ERROR EXPECTED '"petname" not found' >>>>`);
    t.throws(
      () => instanceHandleMapping.petnameToVal.get('to be deleted'),
      /"petname" not found/,
      `can't get what has been deleted`,
    );

    const makeMockBrand = () =>
      harden({
        isMyIssuer: _allegedIssuer => {},
        getAllegedName: () => {},
      });

    const brand1 = makeMockBrand();
    const brand2 = makeMockBrand();
    const brand3 = makeMockBrand();
    brandMapping.addPetname('moola', brand1);
    brandMapping.addPetname('simolean', brand2);
    brandMapping.addPetname('zoeInvite', brand3);

    t.deepEquals(
      dehydrate(harden({ handle: handle1 })),
      {
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [{ kind: 'instanceHandle', petname: 'simpleExchange' }],
      },
      `serialize val with petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"handle":{"@qclass":"slot","index":0}}',
          slots: [{ kind: 'instanceHandle', petname: 'simpleExchange' }],
        }),
      ),
      harden({ handle: handle1 }),
      `deserialize val with petname`,
    );
    t.deepEquals(
      dehydrate(harden({ brand: brand1, value: 40 })),
      harden({
        body: '{"brand":{"@qclass":"slot","index":0},"value":40}',
        slots: [{ kind: 'brand', petname: 'moola' }],
      }),
      `serialize brand with petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"brand":{"@qclass":"slot","index":0},"value":40}',
          slots: [{ kind: 'brand', petname: 'moola' }],
        }),
      ),
      harden({ brand: brand1, value: 40 }),
      `deserialize brand with petname`,
    );
    const proposal = harden({
      want: {
        Asset1: { brand: brand1, value: 60 },
        Asset2: { brand: brand3, value: { instanceHandle: handle3 } },
      },
      give: {
        Price: { brand: brand2, value: 3 },
      },
      exit: {
        afterDeadline: {
          timer: {},
          deadline: 55,
        },
      },
    });
    t.deepEquals(
      dehydrate(proposal),
      {
        body:
          '{"want":{"Asset1":{"brand":{"@qclass":"slot","index":0},"value":60},"Asset2":{"brand":{"@qclass":"slot","index":1},"value":{"instanceHandle":{"@qclass":"slot","index":2}}}},"give":{"Price":{"brand":{"@qclass":"slot","index":3},"value":3}},"exit":{"afterDeadline":{"timer":{"@qclass":"slot","index":4},"deadline":55}}}',
        slots: [
          { kind: 'brand', petname: 'moola' },
          { kind: 'brand', petname: 'zoeInvite' },
          { kind: 'instanceHandle', petname: 'automaticRefund' },
          { kind: 'brand', petname: 'simolean' },
          { kind: 'unnamed', petname: 'unnamed-1' },
        ],
      },
      `dehydrated proposal`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body:
            '{"want":{"Asset1":{"brand":{"@qclass":"slot","index":0},"value":60},"Asset2":{"brand":{"@qclass":"slot","index":1},"value":{"instanceHandle":{"@qclass":"slot","index":2}}}},"give":{"Price":{"brand":{"@qclass":"slot","index":3},"value":3}},"exit":{"afterDeadline":{"timer":{"@qclass":"slot","index":4},"deadline":55}}}',
          slots: [
            { kind: 'brand', petname: 'moola' },
            { kind: 'brand', petname: 'zoeInvite' },
            { kind: 'instanceHandle', petname: 'automaticRefund' },
            { kind: 'brand', petname: 'simolean' },
            { kind: 'unnamed', petname: 'unnamed-1' },
          ],
        }),
      ),
      proposal,
      `hydrated proposal`,
    );
    const handle4 = harden({});
    t.deepEquals(
      dehydrate(harden({ handle: handle4 })),
      {
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [{ kind: 'unnamed', petname: 'unnamed-2' }],
      },
      `serialize val with no petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"handle":{"@qclass":"slot","index":0}}',
          slots: [{ kind: 'unnamed', petname: 'unnamed-2' }],
        }),
      ),
      { handle: handle4 },
      `deserialize same val with no petname`,
    );
    // Name a previously unnamed handle
    instanceHandleMapping.addPetname('autoswap', handle4);
    t.deepEquals(
      dehydrate(harden({ handle: handle4 })),
      {
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [{ kind: 'instanceHandle', petname: 'autoswap' }],
      },
      `serialize val with new petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"handle":{"@qclass":"slot","index":0}}',
          slots: [{ kind: 'instanceHandle', petname: 'autoswap' }],
        }),
      ),
      { handle: handle4 },
      `deserialize same val with new petname`,
    );

    // Test spoofing
    t.notDeepEqual(
      hydrate(
        harden({
          body: '{"handle":{"kind":"instanceHandle","petname":"autoswap"}}',
          slots: [],
        }),
      ),
      { handle: handle4 },
      `deserialize with no slots does not produce the real object`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"handle":{"kind":"instanceHandle","petname":"autoswap"}}',
          slots: [],
        }),
      ),
      { handle: { kind: 'instanceHandle', petname: 'autoswap' } },
      `deserialize with no slots does not produce the real object`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
