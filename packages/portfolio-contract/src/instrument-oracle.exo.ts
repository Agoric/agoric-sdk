/**
 * @file Contract-instance-global instrument TVL oracle.
 * @see {@link prepareInstrumentOracle}
 */
import { prepareRevocableMakerKit } from '@agoric/base-zone/zone-helpers.js';
import type { StatusFor } from '@agoric/portfolio-api';
import { PoolPlaces, type PoolKey } from '@agoric/portfolio-api/src/places.js';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';

import { PoolKeyShapeExt } from './type-guards.ts';

export type InstrumentOracle = {
  submitTvlUpdate: (poolKey: string, tvlUsd: bigint, asOf: number) => void;
};

const assertPoolKey: (
  specimen: string,
) => asserts specimen is PoolKey = specimen => {
  Object.hasOwn(PoolPlaces, specimen) ||
    Fail`unregistered instrument ${q(specimen)}`;
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
    submitTvlUpdate: M.call(PoolKeyShapeExt, M.nat(), M.number()).returns(),
  });

  return zone.exoClass('InstrumentOracle', InstrumentOracleI, () => ({}), {
    submitTvlUpdate(poolKey: string, tvlUsd: bigint, asOf: number) {
      assertPoolKey(poolKey);
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

/**
 * Prepare the contract-instance-global oracle invitation lifecycle.
 *
 * This keeps the singleton, revocation, and invitation-generation durable
 * state together under the caller-supplied oracle subzone.
 */
export const prepareInstrumentOracleInvitationKit = (
  zone: Zone,
  zcf: ZCF,
  publishInstrument: Parameters<typeof prepareInstrumentOracle>[1],
) => {
  const makeInstrumentOracle = prepareInstrumentOracle(zone, publishInstrument);
  const instrumentOracle = zone.makeOnce('instrumentOracleSingleton', () =>
    makeInstrumentOracle(),
  );
  const { makeRevocable, revoke } = prepareRevocableMakerKit(
    zone.subZone('revocable'),
    'InstrumentOracle',
    ['submitTvlUpdate'],
  );
  const currentInstrumentOracle = zone.mapStore<string, InstrumentOracle>(
    'currentInstrumentOracle',
  );
  // Revocation can only reach a caretaker created after invitation redemption.
  // Track invitation generations so an older unredeemed invitation cannot
  // later be redeemed to restore oracle authority after revocation or rotation.
  const instrumentOracleGeneration = zone.mapStore<string, number>(
    'instrumentOracleGeneration',
  );
  if (!instrumentOracleGeneration.has('current')) {
    instrumentOracleGeneration.init('current', 0);
  }

  const revokeInstrumentOracle = () => {
    const current = instrumentOracleGeneration.get('current');
    instrumentOracleGeneration.set('current', current + 1);
    if (!currentInstrumentOracle.has('current')) {
      return false;
    }
    const revoked = revoke(currentInstrumentOracle.get('current'));
    currentInstrumentOracle.delete('current');
    return revoked;
  };

  const makeInstrumentOracleInvitation = () => {
    revokeInstrumentOracle();
    const generation = instrumentOracleGeneration.get('current');
    return zcf.makeInvitation((seat: ZCFSeat) => {
      generation === instrumentOracleGeneration.get('current') ||
        Fail`instrument oracle invitation has been revoked`;
      seat.exit();
      const revocable = makeRevocable(instrumentOracle) as InstrumentOracle;
      currentInstrumentOracle.init('current', revocable);
      return revocable;
    }, 'instrumentOracle');
  };

  return harden({ makeInstrumentOracleInvitation, revokeInstrumentOracle });
};
harden(prepareInstrumentOracleInvitationKit);
