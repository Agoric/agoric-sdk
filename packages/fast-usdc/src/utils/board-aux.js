import { throwRedacted as Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { makeMarshal } from '@endo/marshal';

const BOARD_AUX = 'boardAux';
const marshalData = makeMarshal(_val => Fail`data only`);
/**
 * @param {Brand} brand
 * @param {Pick<BootstrapPowers['consume'], 'board' | 'chainStorage'>} powers
 */
export const publishDisplayInfo = async (brand, { board, chainStorage }) => {
  // chainStorage type includes undefined, which doesn't apply here.
  // @ts-expect-error UNTIL https://github.com/Agoric/agoric-sdk/issues/8247
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  const [id, displayInfo, allegedName] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
    E(brand).getAllegedName(),
  ]);
  const node = E(boardAux).makeChildNode(id);
  const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};
