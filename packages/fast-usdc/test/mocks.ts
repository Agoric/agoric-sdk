import type { HostInterface } from '@agoric/async-flow';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type {
  ChainAddress,
  DenomAmount,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { VowTools } from '@agoric/vow';
import {
  addToAllocation,
  subtractFromAllocation,
} from '@agoric/zoe/src/contractFacet/allocationMath.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import type { AmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { Zone } from '@agoric/zone';
import type { FeeConfig, LogFn } from '../src/types.js';

const { makeEmpty } = AmountMath;

export const prepareMockOrchAccounts = (
  zone: Zone,
  {
    vowTools: { makeVowKit, asVow },
    log,
    usdc,
  }: {
    vowTools: VowTools;
    log: (...args: any[]) => void;
    usdc: { brand: Brand<'nat'>; issuer: Issuer<'nat'> };
  },
) => {
  // each can only be resolved/rejected once per test
  const poolAccountTransferVK = makeVowKit<undefined>();

  const mockedPoolAccount = zone.exo('Mock Pool LocalOrchAccount', undefined, {
    transfer(destination: ChainAddress, amount: DenomAmount) {
      log('PoolAccount.transfer() called with', destination, amount);
      return poolAccountTransferVK.vow;
    },
    deposit(payment: Payment<'nat'>) {
      log('PoolAccount.deposit() called with', payment);
      // XXX consider a mock for deposit failure
      return asVow(async () => usdc.issuer.getAmountOf(payment));
    },
  });

  const poolAccount = mockedPoolAccount as unknown as HostInterface<
    OrchestrationAccount<{ chainId: 'agoric' }>
  >;

  const settlementCallLog = [] as any[];
  const settlementAccountMock = zone.exo('Mock Settlement Account', undefined, {
    transfer(...args) {
      settlementCallLog.push(harden(['transfer', ...args]));
    },
  });
  const settlementAccount = settlementAccountMock as unknown as HostInterface<
    OrchestrationAccount<{ chainId: 'agoric' }>
  >;
  return {
    mockPoolAccount: {
      account: poolAccount,
      transferVResolver: poolAccountTransferVK.resolver,
    },
    settlement: {
      account: settlementAccount,
      callLog: settlementCallLog,
    },
  };
};

export const makeTestLogger = (logger: LogFn) => {
  const logs: unknown[][] = [];
  const log = (...args: any[]) => {
    logs.push(args);
    logger(args);
  };
  const inspectLogs = (index?: number) =>
    typeof index === 'number' ? logs[index] : logs;
  return { log, inspectLogs };
};

export type TestLogger = ReturnType<typeof makeTestLogger>;

export const makeTestFeeConfig = (usdc: Omit<AmountUtils, 'mint'>): FeeConfig =>
  harden({
    flat: usdc.make(1n),
    variableRate: makeRatio(2n, usdc.brand),
    maxVariable: usdc.units(5),
    contractRate: makeRatio(20n, usdc.brand),
  });

export const mockZcf = (zone: Zone) => {
  const callLog = [] as any[];
  const seatToAllocation = new Map<unknown, Allocation>();

  const setAllocation = (seat: unknown, alloc: Allocation) => {
    seatToAllocation.set(seat, alloc);
  };

  const makeEmptySeatKit: () => ZcfSeatKit = zone.exoClassKit(
    'MockSeatKit',
    undefined,
    () => ({}),
    {
      zcfSeat: {
        getCurrentAllocation() {
          return seatToAllocation.get(this.facets.zcfSeat) || harden({});
        },
        getAmountAllocated(kw: string, brand: Brand) {
          const { zcfSeat } = this.facets;
          const alloc = zcfSeat.getCurrentAllocation();
          if (kw in alloc) return alloc[kw];
          return makeEmpty(brand);
        },
        getProposal() {
          const give = seatToAllocation.get(this.facets.zcfSeat) || harden({});
          return harden({ give, want: {}, exit: { onDemand: null } });
        },
        hasExited() {
          assert.fail('Mock');
        },
        exit(completion) {
          callLog.push({ method: 'exit', completion });
        },
      },
      userSeat: {
        getProposal() {
          const give = seatToAllocation.get(this.facets.userSeat) || harden({});
          return harden({ give, want: {}, exit: { onDemand: null } });
        },
        exit(completion) {
          callLog.push({ method: 'exit', completion });
        },
      },
    },
  );

  const kwToIssuerRec = new Map<string, IssuerRecord>();
  const makeZCFMint = zone.exoClass(
    'ZcfMintMock',
    undefined,
    (keyword, assetKind = 'nat') => {
      const kit = makeIssuerKit(keyword, assetKind);
      const { mint, ...rec } = kit;
      const issuerRecord = harden({ ...rec, assetKind });

      return { keyword, mint, issuerRecord };
    },
    {
      getIssuerRecord() {
        return this.state.issuerRecord;
      },
      mintGains(gains, zcfSeat = makeEmptySeatKit().zcfSeat) {
        setAllocation(
          zcfSeat,
          addToAllocation(zcfSeat.getCurrentAllocation(), gains),
        );
        return zcfSeat;
      },
      burnLosses(losses, zcfSeat) {
        setAllocation(
          zcfSeat,
          subtractFromAllocation(zcfSeat.getCurrentAllocation(), losses),
        );
        return zcfSeat;
      },
    },
  );

  const zcf: ZCF = zone.exo('MockZCF', undefined, {
    atomicRearrange(parts) {
      callLog.push({ method: 'atomicRearrange', parts });
      for (const [
        fromSeat,
        toSeat,
        fromAmounts,
        toAmounts = fromAmounts,
      ] of parts) {
        if (fromSeat && fromAmounts) {
          setAllocation(
            fromSeat,
            subtractFromAllocation(
              fromSeat.getCurrentAllocation(),
              fromAmounts,
            ),
          );
        }
        if (toSeat && toAmounts) {
          setAllocation(
            toSeat,
            addToAllocation(toSeat.getCurrentAllocation(), toAmounts),
          );
        }
      }
    },
    makeEmptySeatKit() {
      const kit: ZcfSeatKit = makeEmptySeatKit();
      return kit;
    },
    assertUniqueKeyword() {
      assert.fail('Mock');
    },
    getAssetKind() {
      assert.fail('Mock');
    },
    getBrandForIssuer() {
      assert.fail('Mock');
    },
    getInstance() {
      assert.fail('Mock');
    },
    getInvitationIssuer() {
      assert.fail('Mock');
    },
    getIssuerForBrand() {
      assert.fail('Mock');
    },
    getOfferFilter() {
      assert.fail('Mock');
    },
    getTerms() {
      assert.fail('Mock');
    },
    getZoeService() {
      assert.fail('Mock');
    },
    async makeInvitation<A, R>(
      offerHandler,
      description,
      customDetails,
      proposalShape,
    ) {
      callLog.push({
        method: 'makeInvitation',
        offerHandler,
        description,
        customDetails,
        proposalShape,
      });
      const invitation = makeHandle('Invitation') as Invitation<A, R>;
      return invitation;
    },
    async makeZCFMint<K extends AssetKind>(kw: string, assetKind: K = 'nat') {
      return makeZCFMint(kw, assetKind);
    },
    reallocate() {
      assert.fail('Mock');
    },
    registerFeeMint() {
      assert.fail('Mock');
    },
    saveIssuer() {
      assert.fail('Mock');
    },
    setOfferFilter() {
      assert.fail('Mock');
    },
    setTestJig() {
      assert.fail('Mock');
    },
    shutdown() {
      assert.fail('Mock');
    },
    shutdownWithFailure(reason) {
      callLog.push({ method: 'shutdownWithFailure', reason });
      assert.fail('zcf shutdown!');
    },
    stopAcceptingOffers() {
      assert.fail('Mock');
    },
  });
  return { zcf, callLog, setAllocation };
};
