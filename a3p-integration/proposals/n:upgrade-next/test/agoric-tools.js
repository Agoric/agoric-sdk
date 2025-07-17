import { queryVstorage } from '@agoric/synthetic-chain';
import { makeMarshal, Remotable } from '@endo/marshal';

export const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';

const slotToRemotable = (_slotId, iface = 'Remotable') =>
  Remotable(iface, undefined, {
    getBoardId: () => _slotId,
  });

// /** @param {BoardRemote | object} val */
const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  throw Error(`unknown obj in boardSlottingMarshaller.valToSlot ${val}`);
};

const boardSlottingMarshaller = slotToVal => {
  return makeMarshal(boardValToSlot, slotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};

export const marshaller = boardSlottingMarshaller(slotToRemotable);

export const queryVstorageFormatted = async (path, index = -1) => {
  const data = await queryVstorage(path);

  const formattedData = JSON.parse(data.value);
  const formattedDataAtIndex = JSON.parse(formattedData.values.at(index));
  return marshaller.fromCapData(formattedDataAtIndex);
};
