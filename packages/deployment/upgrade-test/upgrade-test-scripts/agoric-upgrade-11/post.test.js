// @ts-check
import test from 'ava';

// XXX agd closes over ambient authority: execa, process.env
import { agd as agdAmbient } from '../cliHelper.mjs';
import { extractStreamCellValue, makeBoardMarshaller } from '../boardClient.js';

test.before(async t => {
  t.context = { agd: agdAmbient };
});

const makeBoardClient = agd => {
  const m = makeBoardMarshaller();
  const self = {
    data: path => agd.query('vstorage', 'data', path),
    get: async path => {
      const cell = await self.data(path);
      return m.fromCapData(JSON.parse(extractStreamCellValue(cell)));
    },
    ...m,
  };
  return self;
};

const { entries, fromEntries, values, freeze: harden } = Object;

// cf. packages/ERTP/src/amountMath.js
// but we're not in a hardened JS context
const ertp = {
  AssetKind: harden({
    NAT: 'nat',
    SET: 'set',
    COPY_SET: 'copySet',
    COPY_BAG: 'copyBag',
  }),
};

test('boardAux has displayInfo for all well-known brands (except timer)', async t => {
  const { agd } = t.context;

  const bc = makeBoardClient(agd);

  const agoricNames = {
    brand: await bc.get('published.agoricNames.brand').then(fromEntries),
  };

  t.log('agoricNames:', agoricNames);
  for (const [name, brand] of entries(agoricNames.brand)) {
    if (name === 'timer') continue;
    const id = bc.convertValToSlot(brand);
    const aux = await bc.get(`published.boardAux.${id}`);
    t.log(name, id, aux?.displayInfo);
    t.true(values(ertp.AssetKind).includes(aux?.displayInfo?.assetKind));
    if (aux.displayInfo.assetKind === 'nat') {
      t.true(typeof aux.displayInfo.decimalPlaces === 'number');
    }
  }
});

test('IST displayInfo is correct', async t => {
  const { agd } = t.context;
  const { AssetKind } = ertp;

  const bc = makeBoardClient(agd);

  const agoricNames = {
    brand: await bc.get('published.agoricNames.brand').then(fromEntries),
  };
  const id = bc.convertValToSlot(agoricNames.brand.IST);
  const aux = await bc.get(`published.boardAux.${id}`);
  t.deepEqual(aux.displayInfo, { assetKind: AssetKind.NAT, decimalPlaces: 6 });
});
