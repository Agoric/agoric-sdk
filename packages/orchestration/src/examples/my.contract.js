import { M } from '@endo/patterns';
import { OrchestrationPowersShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';

export const meta = M.splitRecord({
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);

export const contract = async (_zcf, _privateArgs, zone, _tools) => {
  return {
    publicFacet: zone.exo('MyPub', undefined, {}),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
