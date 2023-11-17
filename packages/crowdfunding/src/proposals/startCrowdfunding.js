import { Fail } from '@agoric/assert';
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stable } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

const trace = makeTracer('StartCrowdfunding', true);

export const CONTRACT_NAME = 'crowdfunding';

//#region Copy-pasta from upgrade-walletFactory-proposal
// XXX importing caused: Error#1: publishAgoricBrandsDisplayInfo not in CONTRACT_NAME,getManifestForCrowdfunding,startCrowdfunding
const BOARD_AUX = 'boardAux';
const marshalData = makeMarshal(_val => Fail`data only`);
/**
 * @param { BootstrapPowers } powers
 */
export const publishAgoricBrandsDisplayInfo = async ({
  consume: { agoricNames, board, chainStorage },
}) => {
  // chainStorage type includes undefined, which doesn't apply here.
  // @ts-expect-error UNTIL https://github.com/Agoric/agoric-sdk/issues/8247
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  const publishBrandInfo = async brand => {
    const [id, displayInfo, allegedName] = await Promise.all([
      E(board).getId(brand),
      E(brand).getDisplayInfo(),
      E(brand).getAllegedName(),
    ]);
    const node = E(boardAux).makeChildNode(id);
    const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
    await E(node).setValue(JSON.stringify(aux));
  };

  /** @type {ERef<import('@agoric/vats').NameHub>} */
  const brandHub = E(agoricNames).lookup('brand');
  const brands = await E(brandHub).values();
  // tolerate failure; in particular, for the timer brand
  await Promise.allSettled(brands.map(publishBrandInfo));
};
harden(publishAgoricBrandsDisplayInfo);

/**
 * @param {import('@agoric/inter-protocol/src/proposals/econ-behaviors').EconomyBootstrapPowers} powers
 */
export const startCrowdfunding = async ({
  consume: { board, chainStorage, diagnostics, zoe },
  produce: { crowdfundingKit },
  installation: {
    consume: { crowdfunding: crowdfundingInstallation },
  },
  instance: {
    produce: { crowdfunding: crowdfundingInstance },
  },
  brand: {
    consume: { [Stable.symbol]: feeBrandP },
  },
}) => {
  trace('startCrowdfunding');

  const storageNode = await makeStorageNodeChild(chainStorage, CONTRACT_NAME);

  // no need to publish to the board
  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = {
    storageNode,
    marshaller,
  };
  /**
   * @type {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<import('@agoric/crowdfunding/src/crowdfunding.contract.js')['start']>}
   */
  const startResult = await E(zoe).startInstance(
    crowdfundingInstallation,
    {}, // IssuerKeyword record
    { feeBrand: await feeBrandP }, // terms
    privateArgs,
    'crowdfunding',
  );
  crowdfundingKit.resolve(startResult);

  await E(diagnostics).savePrivateArgs(startResult.instance, privateArgs);

  crowdfundingInstance.resolve(startResult.instance);
};
harden(startCrowdfunding);

export const getManifestForCrowdfunding = (
  { restoreRef },
  { crowdfundingRef },
) => ({
  manifest: {
    [publishAgoricBrandsDisplayInfo.name]: {
      consume: { agoricNames: true, board: true, chainStorage: true },
    },
    [startCrowdfunding.name]: {
      consume: {
        board: true,
        chainStorage: true,
        diagnostics: true,
        zoe: true,
      },
      produce: {
        crowdfundingKit: true,
      },
      installation: {
        consume: { crowdfunding: true },
      },
      instance: {
        produce: { crowdfunding: 'crowdfunding' },
      },
      brand: {
        consume: { [Stable.symbol]: 'zoe' },
      },
    },
  },
  installations: {
    [CONTRACT_NAME]: restoreRef(crowdfundingRef),
  },
});
