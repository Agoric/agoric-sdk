import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const build = async (log, zoe, installations) => {
  return makeExo(
    'build',
    M.interface('build', {}, { defaultGuards: 'passable' }),
    {
      minimalMakeKindTest: async () => {
        const result = await E(zoe).startInstance(
          installations.minimalMakeKind,
        );
        log(result);
      },
    },
  );
};

export function buildRootObject(vatPowers) {
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      build: (...args) => build(vatPowers.testLog, ...args),
    },
  );
}
