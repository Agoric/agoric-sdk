import { getDetailsMatchingVats } from '@agoric/synthetic-chain';
import { naturalCompare } from '@agoric/internal';

export const getGovernedVatDetails = async (nameCommon, includeTerminated) => {
  const detailsArray = await getDetailsMatchingVats(nameCommon);
  return (
    detailsArray
      // the governor launches the governed, and therefore has a lower vatID
      .sort((a, b) => naturalCompare(a.vatID, b.vatID))
      .flatMap(({ vatName, terminated, ...details }) => {
        if (terminated && !includeTerminated) return [];
        const nameSuffix = vatName.slice(
          vatName.indexOf(nameCommon) + nameCommon.length,
        );
        return [{ ...details, vatName, terminated, nameSuffix }];
      })
  );
};
