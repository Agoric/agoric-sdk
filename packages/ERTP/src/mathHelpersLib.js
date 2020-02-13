import { importManager } from '@agoric/import-manager';
import natMathHelpers from './mathHelpers/natMathHelpers';
import natListMathHelpers from './mathHelpers/natListMathHelpers';
import handleMathHelpers from './mathHelpers/handleMathHelpers';
import inviteMathHelpers from './mathHelpers/inviteMathHelpers';

const manager = importManager();
const mathHelpersLib = manager.addExports({
  nat: natMathHelpers,
  natList: natListMathHelpers,
  handle: handleMathHelpers,
  invite: inviteMathHelpers,
});

export default mathHelpersLib;
