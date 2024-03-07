import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const pin = [];
  const doomedExport1 = makeExo(
    'doomedExport1',
    M.interface('doomedExport1', {}, { defaultGuards: 'passable' }),
    {},
  );
  const doomedExport2 = makeExo(
    'doomedExport2',
    M.interface('doomedExport2', {}, { defaultGuards: 'passable' }),
    {},
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      accept(exportToDoomedPresence) {
        pin.push(exportToDoomedPresence);
      },
      getDoomedExport1() {
        return doomedExport1;
      },
      stashDoomedExport2(target) {
        E(E(target).one()).neverCalled(doomedExport2);
      },
      terminate() {
        vatPowers.exitVat('completion');
      },
    },
  );
}
