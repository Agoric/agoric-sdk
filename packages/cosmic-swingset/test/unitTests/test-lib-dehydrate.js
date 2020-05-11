// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeDehydrator } from '../../lib/ag-solo/vats/lib-dehydrate';

test('makeDehydrator', async t => {
  try {
    const { hydrate, dehydrate, makeMappings } = makeDehydrator();

    const instanceHandleMappings = makeMappings('instanceHandle');
    const brandMappings = makeMappings('brand');

    const handle1 = harden({});
    const handle2 = harden({});
    const handle3 = harden({});
    instanceHandleMappings.addPetname('simpleExchange', handle1);
    instanceHandleMappings.addPetname('atomicSwap', handle2);
    instanceHandleMappings.addPetname('automaticRefund', handle3);

    const makeMockBrand = () =>
      harden({
        isMyIssuer: _allegedIssuer => {},
        getAllegedName: () => {},
      });

    const brand1 = makeMockBrand();
    const brand2 = makeMockBrand();
    const brand3 = makeMockBrand();
    brandMappings.addPetname('moola', brand1);
    brandMappings.addPetname('simolean', brand2);
    brandMappings.addPetname('zoeInvite', brand3);

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
      dehydrate(harden({ brand: brand1, extent: 40 })),
      harden({
        body: '{"brand":{"@qclass":"slot","index":0},"extent":40}',
        slots: [{ kind: 'brand', petname: 'moola' }],
      }),
      `serialize brand with petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"brand":{"@qclass":"slot","index":0},"extent":40}',
          slots: [{ kind: 'brand', petname: 'moola' }],
        }),
      ),
      harden({ brand: brand1, extent: 40 }),
      `deserialize brand with petname`,
    );
    const proposal = harden({
      want: {
        Asset1: { brand: brand1, extent: 60 },
        Asset2: { brand: brand3, extent: { instanceHandle: handle3 } },
      },
      give: {
        Price: { brand: brand2, extent: 3 },
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
          '{"want":{"Asset1":{"brand":{"@qclass":"slot","index":0},"extent":60},"Asset2":{"brand":{"@qclass":"slot","index":1},"extent":{"instanceHandle":{"@qclass":"slot","index":2}}}},"give":{"Price":{"brand":{"@qclass":"slot","index":3},"extent":3}},"exit":{"afterDeadline":{"timer":{"@qclass":"slot","index":4},"deadline":55}}}',
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
            '{"want":{"Asset1":{"brand":{"@qclass":"slot","index":0},"extent":60},"Asset2":{"brand":{"@qclass":"slot","index":1},"extent":{"instanceHandle":{"@qclass":"slot","index":2}}}},"give":{"Price":{"brand":{"@qclass":"slot","index":3},"extent":3}},"exit":{"afterDeadline":{"timer":{"@qclass":"slot","index":4},"deadline":55}}}',
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
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
