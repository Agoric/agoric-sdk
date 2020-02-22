import harden from '@agoric/harden';

import { assert, details } from '@agoric/assert';
import { mustBeComparable } from '@agoric/marshal';
import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';

const insistDescription = description => {
  assert(!!description, details`description must be truthy ${description}`);
  mustBeComparable(description);
};

const inviteConfig = harden({
  ...noCustomization,
  makeMintKeeper: makeCoreMintKeeper,
  extentOpsName: 'inviteExtentOps',
  extentOpsArgs: [insistDescription],
});

export { inviteConfig };
