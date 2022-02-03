import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';

import { makeDehydrator } from '../src/lib-dehydrate.js';

test('makeDehydrator', async t => {
  const { hydrate, dehydrate, makeMapping } = makeDehydrator();

  const instanceHandleMapping = makeMapping('instanceHandle');
  const brandMapping = makeMapping('brand');

  const handle1 = Far('handle1');
  const handle2 = Far('handle2');
  const handle3 = Far('handle3');
  instanceHandleMapping.addPetname('simpleExchange', handle1);
  instanceHandleMapping.addPetname('atomicSwap', handle2);
  instanceHandleMapping.addPetname('automaticRefund', handle3);
  t.throws(() => instanceHandleMapping.addPetname('simpleExchange2', handle1), {
    message: /val .* already has a petname/,
  });
  t.throws(
    () =>
      instanceHandleMapping.addPetname(
        'simpleExchange',
        Far('simpleExchangeHandle'),
      ),
    { message: /petname .* is already in use/ },
  );

  // Test renaming.
  instanceHandleMapping.renamePetname('whatever', handle1);
  t.is(
    instanceHandleMapping.valToPetname.get(handle1),
    'whatever',
    `renaming is successful going from val to petname`,
  );
  t.deepEqual(
    instanceHandleMapping.petnameToVal.get('whatever'),
    handle1,
    `renaming is successful going from val to petname`,
  );
  t.throws(
    () => instanceHandleMapping.renamePetname('new value', Far('newHandle')),
    {
      message: /has not been previously named, would you like to add it instead\?/,
    },
    `can't rename something that was never added`,
  );
  // rename it back
  instanceHandleMapping.renamePetname('simpleExchange', handle1);
  t.is(
    instanceHandleMapping.valToPetname.get(handle1),
    'simpleExchange',
    `second renaming is successful going from val to petname`,
  );
  t.deepEqual(
    instanceHandleMapping.petnameToVal.get('simpleExchange'),
    handle1,
    `second renaming is successful going from val to petname`,
  );

  // Test deletion.
  const temp = Far('temp');
  instanceHandleMapping.addPetname('to be deleted', temp);
  t.is(
    instanceHandleMapping.valToPetname.get(temp),
    'to be deleted',
    `'to be deleted' present going from val to petname`,
  );
  t.deepEqual(
    instanceHandleMapping.petnameToVal.get('to be deleted'),
    temp,
    `'to be deleted' present going from val to petname`,
  );
  instanceHandleMapping.deletePetname('to be deleted');
  t.throws(
    () => instanceHandleMapping.petnameToVal.get('to be deleted'),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // /"petname" not found/
        /.* not found/,
    },
    `can't get what has been deleted`,
  );

  const makeMockBrand = () =>
    Far('mock brand', {
      isMyIssuer: _allegedIssuer => {},
      getAllegedName: () => {},
    });

  const brand1 = makeMockBrand();
  const brand2 = makeMockBrand();
  const brand3 = makeMockBrand();
  brandMapping.addPetname('moola', brand1);
  brandMapping.addPath(['agoric', 'Moola'], brand1);
  t.deepEqual(
    brandMapping.valToPaths.get(brand1),
    [['agoric', 'Moola']],
    `use valToPaths`,
  );
  brandMapping.addPetname('simolean', brand2);
  brandMapping.addPetname('zoeInvite', brand3);

  t.deepEqual(
    dehydrate(harden({ handle: handle1 })),
    {
      body:
        '{"handle":{"@qclass":"slot","iface":"Alleged: handle1","index":0}}',
      slots: [{ kind: 'instanceHandle', petname: 'simpleExchange' }],
    },
    `serialize val with petname`,
  );
  t.deepEqual(
    hydrate(
      harden({
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [
          {
            kind: 'instanceHandle',
            petname: 'simpleExchange',
          },
        ],
      }),
    ),
    harden({ handle: handle1 }),
    `deserialize val with petname`,
  );
  t.deepEqual(
    dehydrate(harden({ brand: brand1, value: 40 })),
    harden({
      body:
        '{"brand":{"@qclass":"slot","iface":"Alleged: mock brand","index":0},"value":40}',
      slots: [{ kind: 'brand', petname: 'moola' }],
    }),
    `serialize brand with petname`,
  );
  t.deepEqual(
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
        timer: Far('timer', {}),
        deadline: 55,
      },
    },
  });
  t.deepEqual(
    dehydrate(proposal),
    {
      body:
        '{"exit":{"afterDeadline":{"deadline":55,"timer":{"@qclass":"slot","iface":"Alleged: timer","index":0}}},"give":{"Price":{"brand":{"@qclass":"slot","iface":"Alleged: mock brand","index":1},"value":3}},"want":{"Asset1":{"brand":{"@qclass":"slot","iface":"Alleged: mock brand","index":2},"value":60},"Asset2":{"brand":{"@qclass":"slot","iface":"Alleged: mock brand","index":3},"value":{"instanceHandle":{"@qclass":"slot","iface":"Alleged: handle3","index":4}}}}}',
      slots: [
        { kind: 'unnamed', petname: 'unnamed-1' },
        { kind: 'brand', petname: 'simolean' },
        { kind: 'brand', petname: 'moola' },
        { kind: 'brand', petname: 'zoeInvite' },
        { kind: 'instanceHandle', petname: 'automaticRefund' },
      ],
    },
    `dehydrated proposal`,
  );
  t.deepEqual(
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
  const handle4 = Far('handle4');
  t.deepEqual(
    dehydrate(harden({ handle: handle4 })),
    {
      body:
        '{"handle":{"@qclass":"slot","iface":"Alleged: handle4","index":0}}',
      slots: [{ kind: 'unnamed', petname: 'unnamed-2' }],
    },
    `serialize val with no petname`,
  );
  t.deepEqual(
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
  t.deepEqual(
    dehydrate(harden({ handle: handle4 })),
    {
      body:
        '{"handle":{"@qclass":"slot","iface":"Alleged: handle4","index":0}}',
      slots: [{ kind: 'instanceHandle', petname: 'autoswap' }],
    },
    `serialize val with new petname`,
  );
  t.deepEqual(
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
  t.deepEqual(
    hydrate(
      harden({
        body: '{"handle":{"kind":"instanceHandle","petname":"autoswap"}}',
        slots: [],
      }),
    ),
    {
      handle: { kind: 'instanceHandle', petname: 'autoswap' },
    },
    `deserialize with no slots does not produce the real object`,
  );
});
