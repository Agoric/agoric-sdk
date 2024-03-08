import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject() {
  const target1 = makeExo(
    'target1',
    M.interface('target1', {}, { defaultGuards: 'passable' }),
    {
      one(_p) {
        log(`target1 in one`);
      },
      two() {
        log(`target1 in two`);
      },
      three(_p) {
        log(`target1 in three`);
      },
      four() {
        log(`target1 in four`);
      },
    },
  );
  const target2 = makeExo(
    'target2',
    M.interface('target2', {}, { defaultGuards: 'passable' }),
    {
      one(_p) {
        log(`target2 in one`);
      },
      two() {
        log(`target2 in two`);
      },
      three(_p) {
        log(`target2 in three`);
      },
      four() {
        log(`target2 in four`);
      },
    },
  );
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      bootstrap(vats) {
        const bob = vats.bob;
        const p1 = E(bob).result();
        E(bob).promise(p1);
        E(bob).run(target1, target2);
      },
    },
  );
}
