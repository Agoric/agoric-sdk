import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const build = async (log, zoe, installations) => {
  return makeExo(
    'build',
    M.interface('build', {}, { defaultGuards: 'passable' }),
    {
      privateArgsUsageTest: async () => {
        const privateArgs = harden({
          myArg: makeExo(
            'arg',
            M.interface('arg', {}, { defaultGuards: 'passable' }),
            {
              doTest: () => 'privateArgs.myArg was accessed in the contract',
            },
          ),
        });
        const { creatorFacet } = await E(zoe).startInstance(
          installations.privateArgsUsageContract,
          undefined,
          undefined,
          privateArgs,
        );

        const testResult = await E(creatorFacet).usePrivateArgs();
        log(testResult);
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
