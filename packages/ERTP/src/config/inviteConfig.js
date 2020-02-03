import harden from '@agoric/harden';

import { insist } from '@agoric/insist';
import { mustBeComparable } from '@agoric/same-structure';
import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';

const insistDescription = description => {
  insist(!!description)`description must be truthy ${description}`;
  mustBeComparable(description);
};

const inviteConfig = harden({
  ...noCustomization,
  makeMintKeeper: makeCoreMintKeeper,
  extentOpsName: 'inviteExtentOps',
  extentOpsArgs: [insistDescription],
});

export { inviteConfig };
