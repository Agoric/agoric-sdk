/* global setImmediate */
// @ts-check
/* eslint-disable no-unused-vars */
// eslint-disable-next-line import/order
import { test as anyTest } from '../../../../tools/prepare-test-env-ava.js';

import url from 'url';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, Far } from '@endo/far';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeCopyBag } from '@endo/patterns';
import { makeNameHubKit } from '@agoric/vats';
import { TimeMath } from '@agoric/time';
import buildManualTimer from '../../../../tools/manualTimer.js';
import centralSupplyBundle from '@agoric/vats/bundles/bundle-centralSupply.js';

import { mintStablePayment } from './mintStable.js';
import { makePromiseKit } from '@endo/promise-kit';

const DAY = 24 * 60 * 60 * 1000;
const UNIT6 = 1_000_000n;

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const asset = ref => url.fileURLToPath(new URL(ref, import.meta.url));

const makeTestContext = async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  const bundle = await bundleCache.load(
    asset('../../../../src/contracts/gimix/gimix.js'),
    'gimix',
  );

  const eventLoopIteration = () => new Promise(setImmediate);

  const manualTimer = buildManualTimer(
    t.log,
    BigInt((2020 - 1970) * 365.25 * DAY),
    {
      timeStep: BigInt(DAY),
      eventLoopIteration,
    },
  );

  const bootstrap = async () => {
    const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();

    const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
      makeNameHubKit();

    const istIssuer = await E(zoe).getFeeIssuer();
    const istBrand = await E(istIssuer).getBrand();
    const centralSupply = await E(zoe).install(centralSupplyBundle);

    /** @type {import('@agoric/time/src/types').TimerService} */
    const chainTimerService = manualTimer;
    const timerBrand = await E(chainTimerService).getTimerBrand();

    // really a namehub...
    const agoricNames = {
      issuer: { IST: istIssuer },
      brand: { timerBrand, IST: istBrand },
      installation: { centralSupply },
      instance: {},
    };

    const board = new Map(); // sort of

    return {
      agoricNames,
      board,
      chainTimerService,
      feeMintAccess,
      namesByAddress,
      namesByAddressAdmin,
      zoe,
    };
  };

  const powers = await bootstrap();

  const {
    agoricNames: { installation, issuer },
  } = powers;
  /** @param {bigint} value */
  const faucet = async value => {
    const pmt = await mintStablePayment(value, {
      centralSupply: installation.centralSupply,
      feeMintAccess: powers.feeMintAccess,
      zoe: powers.zoe,
    });

    const purse = await E(issuer.IST).makeEmptyPurse();
    await E(purse).deposit(pmt);
    return purse;
  };

  return { bundle, faucet, manualTimer, powers };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('start contract; make work agreement', async t => {
  const coreEval = async oracleDepositP => {
    const { powers, bundle } = t.context;
    const {
      agoricNames,
      board,
      chainTimerService,
      namesByAddress,
      namesByAddressAdmin,
      zoe,
    } = powers;

    // const id = await E(board).getId(chainTimerService);
    board.set('board123', chainTimerService);

    // TODO: add bob's address
    namesByAddressAdmin.update('agoric1oracle', oracleDepositP);

    /** @type {Installation<import('../../../../src/contracts/gimix/gimix').prepare>} */
    const installation = await E(zoe).install(bundle);

    const { creatorFacet, instance: gimixInstance } = await E(
      zoe,
    ).startInstance(
      installation,
      { Stable: agoricNames.issuer.IST },
      { namesByAddress, timer: chainTimerService },
    );
    const {
      brands: { GimixOracle },
    } = await E(zoe).getTerms(gimixInstance);

    const oracleInvitation = await E(creatorFacet).makeOracleInvitation();
    void E(oracleDepositP).receive(oracleInvitation);

    // really a namehub...
    const withGiMix = {
      ...agoricNames,
      brand: { ...agoricNames.brand, GimixOracle },
      installation: { ...agoricNames.installation, gimix: installation },
      instance: { ...agoricNames.instance, gimix: gimixInstance },
    };
    return { agoricNames: withGiMix, board };
  };

  const sync = {
    oracleDeposit: makePromiseKit(),
  };
  const { agoricNames, board } = await coreEval(sync.oracleDeposit.promise);

  /**
   * @param {ERef<ZoeService>} zoe
   * @param {ERef<Purse>} purseP
   * @param {string} issue
   * @param {bigint} when
   * @param {string} timerBoardId
   */
  const alice = async (
    zoe,
    purseP,
    issue = 'https://github.com/Agoric/agoric-sdk/issues/8523',
    bounty = 12n,
    when = 1234n,
    timerBoardId = 'board123',
  ) => {
    const { make } = AmountMath;
    const { brand, instance } = agoricNames;
    const { timerBrand } = brand;
    const timer = board.get(timerBoardId);

    const gpf = await E(zoe).getPublicFacet(instance.gimix);

    const give = {
      Acceptance: make(brand.IST, bounty * UNIT6),
    };
    t.log('bounty', give);
    const want = {
      Stamp: make(brand.GimixOracle, makeCopyBag([[`Fixed ${issue}`, 1n]])),
    };

    /** @type {import('@agoric/time/src/types').TimestampRecord} */
    const deadline = { timerBrand, absValue: when };
    const exit = { afterDeadline: { deadline, timer } };

    const payments = { Acceptance: await E(purseP).withdraw(give.Acceptance) };
    const toMakeAgreement = await E(gpf).makeWorkAgreementInvitation(issue);
    const seat = await E(zoe).offer(
      toMakeAgreement,
      { give, want, exit },
      payments,
    );
    const result = await E(seat).getOfferResult();

    t.log('resulting job id', result);
    t.deepEqual(typeof result, 'string');
  };

  /**
   * @param {ERef<ZoeService>} zoe
   * @param {import('@endo/promise-kit').PromiseKit<DepositFacet>} depositPK
   */
  const githubOracle = async (zoe, depositPK) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitationPurse = E(invitationIssuer).makeEmptyPurse();

    const offerResults = new Map();

    const acceptId = 'oracleAccept1';

    // oracle operator does this
    const setup = async amt => {
      t.log('oracle invation amount', amt);
      const invitation = await E(invitationPurse).withdraw(amt);
      const seat = await E(zoe).offer(invitation, {
        give: {},
        want: {},
        exit: { onDemand: undefined },
      });
      const reporter = await E(seat).getOfferResult();
      t.log('oracle reporter', reporter);
      offerResults.set(acceptId, reporter);
    };

    /** @type {DepositFacet} */
    // @ts-expect-error callWhen
    const depositFacet = Far('deposit', {
      receive: async pmt => {
        // XXX find purse by allegedBrand?
        // @ts-expect-error callWhen
        const amt = await E(invitationPurse).deposit(pmt);
        void setup(amt);
        return amt;
      },
    });
    depositPK.resolve(depositFacet);
  };

  const { rootNode, data } = makeFakeStorageKit('X');

  const {
    faucet,
    powers: { zoe },
  } = t.context;
  await Promise.all([
    alice(zoe, faucet(25n * UNIT6)),
    githubOracle(zoe, sync.oracleDeposit),
  ]);
  t.log('done');
  t.pass();
});

test.todo('make work agreement at wallet bridge / vstorage level');
