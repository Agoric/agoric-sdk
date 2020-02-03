import { importManager } from '@agoric/import-manager';

import { makePixelExtentOps } from '@agoric/pixel-demo/src/pixelExtentOps';

import { makeNatExtentOps } from './extentOps/natExtentOps';
import { makeUniExtentOps } from './extentOps/uniExtentOps';

const manager = importManager();
const extentOpsLib = manager.addExports({
  natExtentOps: makeNatExtentOps,
  inviteExtentOps: makeUniExtentOps,
  pixelExtentOps: makePixelExtentOps,
  uniExtentOps: makeUniExtentOps,
});

export { extentOpsLib };
