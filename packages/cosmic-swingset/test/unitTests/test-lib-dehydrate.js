// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeDehydrator } from '../../lib/ag-solo/vats/lib-dehydrate';

test('makeDehydrator', async t => {
  try {
    const {
      hydrate,
      dehydrate,
      makeMappings,
      updateSearchOrder,
      getSearchOrder,
    } = makeDehydrator();

    const instanceHandleMappings = makeMappings('instanceHandle');
    makeMappings('brand');

    t.deepEquals(
      getSearchOrder(),
      ['instanceHandle', 'brand'],
      `default search order matches insertion order`,
    );

    const searchOrder = ['brand', 'instanceHandle'];
    updateSearchOrder(searchOrder);
    t.deepEquals(
      getSearchOrder(),
      searchOrder,
      `updating the search order changed the order`,
    );

    const handle1 = harden({});
    instanceHandleMappings.addPetname('simpleExchange', handle1);

    t.deepEquals(
      dehydrate(harden({ handle: handle1 })),
      {
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [{ kind: 'instanceHandle', petname: 'simpleExchange' }],
      },
      `serialize val with petname`,
    );
    const handle2 = harden({});
    t.deepEquals(
      dehydrate(harden({ handle: handle2 })),
      {
        body: '{"handle":{"@qclass":"slot","index":0}}',
        slots: [{ kind: 'unnamed', petname: 'unnamed-1' }],
      },
      `serialize val with no petname`,
    );
    t.deepEquals(
      hydrate(
        harden({
          body: '{"handle":{"@qclass":"slot","index":0}}',
          slots: [{ kind: 'unnamed', petname: 'unnamed-1' }],
        }),
      ),
      { handle: handle2 },
      `deserialize same val with no petname`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
