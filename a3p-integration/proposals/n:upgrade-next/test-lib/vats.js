import { getDetailsMatchingVats } from '@agoric/synthetic-chain';

// Poor man's naturalCompare, since that function cannot be imported from
// @agoric/internal at time of writing.
const compareVatIDs = (a, b) => {
  const [_a, aSuffix] = a.vatID.match(/^v([0-9]+)$/);
  const [_b, bSuffix] = b.vatID.match(/^v([0-9]+)$/);
  return aSuffix - bSuffix;
};

export const getGovernedVatDetails = async (nameCommon, includeTerminated) => {
  const detailsArray = await getDetailsMatchingVats(nameCommon);
  return (
    detailsArray
      // the governor launches the governed, and therefore has a lower vatID
      .sort(compareVatIDs)
      .flatMap(({ vatName, terminated, ...details }) => {
        if (terminated && !includeTerminated) return [];
        const nameSuffix = vatName.slice(
          vatName.indexOf(nameCommon) + nameCommon.length,
        );
        return [{ ...details, vatName, terminated, nameSuffix }];
      })
  );
};
