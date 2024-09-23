// @ts-check
import { E } from '@endo/far';

export const BOARD_AUX_PATH_SEGMENT = 'boardAux';

/**
 * @param {StorageNode} node
 * @param {unknown} passable
 * @param {ERef<Marshaller>} marshaller
 */
export const publish = async (node, passable, marshaller) => {
  const capData = await E(marshaller).toCapData(passable);
  const value = JSON.stringify(capData);
  await E(node).setValue(value);
};

export const makeBoardAuxNode = storageRoot =>
  E(storageRoot).makeChildNode(BOARD_AUX_PATH_SEGMENT);

export const boardAuxChild = (storageRoot, id) => {
  return E(makeBoardAuxNode(storageRoot)).makeChildNode(id);
};
