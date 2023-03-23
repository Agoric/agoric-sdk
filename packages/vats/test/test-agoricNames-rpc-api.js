// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';

import { E, Far } from '@endo/far';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  agoricNamesReserved,
  makeAgoricNamesAccess,
} from '../src/core/utils.js';
import { makePromiseSpace } from '../src/core/promise-space.js';
import { publishAgoricNames } from '../src/core/chain-behaviors.js';
import { makeBoard } from '../src/lib-board.js';
import { boardSlottingMarshaller } from '../tools/board-utils.js';

function* mapIterator(iterator, mapping) {
  for (let i of iterator) {
    yield mapping(i);
  }
}

test('agoricNames chainStorage RPC API', async t => {
  const storage = makeFakeStorageKit('published');
  const { produce, consume } = makePromiseSpace();
  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  produce.chainStorage.resolve(storage.rootNode);

  const board = makeBoard();
  produce.board.resolve(board);

  const x = agoricNamesReserved;
  /** @type {BootstrapPowers} */
  // @ts-expect-error mock
  const powers = { produce, consume, ...spaces };
  await publishAgoricNames(powers);

  const { entries } = Object;
  const makeBoardRemote = ({ boardId, iface }) => Far(iface, {}); //getBoardId: () => boardId
  const cap = s => s.slice(0, 1).toUpperCase() + s.slice(1);
  await Promise.all(
    entries(agoricNamesReserved).flatMap(([kind, record]) =>
      entries(record).map(([name, label]) =>
        E(E(agoricNamesAdmin).lookupAdmin(kind)).update(
          name,
          makeBoardRemote({
            boardId: board.getId(Far(kind, {})),
            iface: cap(kind),
          }),
        ),
      ),
    ),
  );

  // chainStorage publication is unsynchronized
  await eventLoopIteration();

  const m = boardSlottingMarshaller((slot, _iface) => board.getValue(slot));
  const live = [
    ...mapIterator(storage.data.entries(), ([key, val]) => [
      key,
      m.unserialize(JSON.parse(val)),
    ]),
  ];

  const note = `agoricNames reflects a NameHub as follows.
  See also board marshalling conventions (_to appear_).
  
  TODO:
   - prune issuers, brands: Attestation, AUSD
     installations: centralSupply, noActionElectorate, liquidate
                    stakeFactory, Pegasus
     instances: Treasury, stakeFactory, stakeFactoryGovernor, Pegasus
     uiConfig
     (not product features to document, yet)
   - add oracleBrand.ATOM
   - fix vbankAsset structure
  `;

  t.snapshot(live, note);
});
