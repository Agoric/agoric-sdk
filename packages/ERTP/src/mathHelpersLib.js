import { importManager } from '@agoric/import-manager';
import natMathHelpers from './mathHelpers/natMathHelpers';
import strSetMathHelpers from './mathHelpers/strSetMathHelpers';
import setMathHelpers from './mathHelpers/setMathHelpers';

const manager = importManager();
const mathHelpersLib = manager.addExports({
  nat: natMathHelpers,
  strSet: strSetMathHelpers,
  set: setMathHelpers,
});

export default mathHelpersLib;
