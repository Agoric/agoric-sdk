import harden from '@agoric/harden';

import { noCustomization } from './noCustomization';
import { makeCoreMintKeeper } from './coreMintKeeper';

import { insist } from '../../util/insist';
import { mustBeComparable } from '../../util/sameStructure';

const insistDescription = description => {
  insist(!!description)`description must be truthy ${description}`;
  mustBeComparable(description);
};

function makeInviteConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'inviteExtentOps',
    extentOpsArgs: [insistDescription],
  });
}

export { makeInviteConfig };
