/**
 * @file Contract-instance-global instrument TVL oracle.
 * @see {@link prepareInstrumentOracle}
 */
import type { StatusFor } from '@agoric/portfolio-api';
import { PoolPlaces, type PoolKey } from '@agoric/portfolio-api/src/places.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';

export type InstrumentOracle = {
  submitTvlUpdate: (poolKey: PoolKey, tvlUsd: bigint, asOf: number) => void;
};

/**
 * Prepare the singleton oracle object. The caller supplies only the narrowed
 * publication authority needed by the oracle.
 */
export const prepareInstrumentOracle = (
  zone: Zone,
  publishInstrument: (
    poolKey: PoolKey,
    status: StatusFor['instrument'],
  ) => void,
) => {
  const latestByPool = zone.mapStore<PoolKey, StatusFor['instrument']>(
    'latestByPool',
  );

  const InstrumentOracleI = M.interface('InstrumentOracle', {
    submitTvlUpdate: M.call(M.string(), M.nat(), M.number()).returns(),
  });

  return zone.exoClass('InstrumentOracle', InstrumentOracleI, () => ({}), {
    submitTvlUpdate(poolKey: PoolKey, tvlUsd: bigint, asOf: number) {
      Object.hasOwn(PoolPlaces, poolKey) ||
        Fail`unregistered instrument ${q(poolKey)}`;
      (Number.isSafeInteger(asOf) && asOf >= 0) ||
        Fail`asOf must be a non-negative Unix timestamp in seconds`;

      if (latestByPool.has(poolKey)) {
        const previous = latestByPool.get(poolKey);
        asOf > previous.asOf ||
          Fail`asOf ${asOf} is not newer than ${previous.asOf}`;
      }

      const status = harden({ tvlUsd, asOf });
      latestByPool.has(poolKey)
        ? latestByPool.set(poolKey, status)
        : latestByPool.init(poolKey, status);
      publishInstrument(poolKey, status);
    },
  });
};
harden(prepareInstrumentOracle);
