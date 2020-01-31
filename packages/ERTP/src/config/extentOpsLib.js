import { importManager } from '../../../prev-ertp/more/imports/importManager';

import { makeNatExtentOps } from './extentOps/natExtentOps';
import { makeUniExtentOps } from './extentOps/uniExtentOps';
import { makePixelExtentOps } from '../../../prev-ertp/more/pixels/pixelExtentOps';

const manager = importManager();
const extentOpsLib = manager.addExports({
  natExtentOps: makeNatExtentOps,
  inviteExtentOps: makeUniExtentOps,
  pixelExtentOps: makePixelExtentOps,
  uniExtentOps: makeUniExtentOps,
});

export { extentOpsLib };
