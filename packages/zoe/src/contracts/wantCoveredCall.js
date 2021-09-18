// // @ts-check

// import { M } from '@agoric/store';

// export const makeWantCoveredCall = (coveredCallInstallation, timer) => {
//   const wantCoveredCall = ({
//     handle = M.any(),
//     instance = M.any(),
//     minUnderlying,
//     maxStrikePrice,
//     minExpirationDate,
//     timeAuthority = timer,
//   }) => {
//     return harden({
//       handle,
//       instance,
//       installation: coveredCallInstallation,
//       description: 'exerciseOption',
//       underlyingAssets: { UnderlyingAsset: M.gte(minUnderlying) },
//       strikePrice: { StrikePrice: M.lte(maxStrikePrice) },
//       expirationDate: M.gte(minExpirationDate),
//       timeAuthority,
//     });
//   };
//   return harden(wantCoveredCall);
// };
// harden(makeWantCoveredCall);
