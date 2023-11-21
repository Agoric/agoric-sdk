/* global setImmediate */
// @ts-check
// eslint-disable-next-line import/order
import { test as anyTest } from '../../../../tools/prepare-test-env-ava.js';

import { createRequire } from 'module';
import { E, Far } from '@endo/far';
import { makeCopyBag } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeNameHubKit, makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { TimeMath } from '@agoric/time';
import { deeplyFulfilledObject } from '@agoric/internal';

import { makeMarshal } from '@endo/marshal';
import { mintStablePayment } from './mintStable.js';
import {
  oracleBrandAuxValue,
  startGiMiX,
} from '../../../../src/contracts/gimix/start-gimix.js';
import { startPostalSvc } from '../../../../src/contracts/gimix/start-postalSvc.js';
import { makeZoeKitForTest } from '../../../../tools/setup-zoe.js';
import buildManualTimer from '../../../../tools/manualTimer.js';

const DAY = 24 * 60 * 60 * 1000;
const UNIT6 = 1_000_000n;

const { entries, values } = Object;
const { Fail } = assert;

/** @type {<T>(x: T | null | undefined) => T} */
const NonNullish = x => {
  if (x === null || x === undefined) {
    throw Error('null/undefined');
  }
  return x;
};

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const myRequire = createRequire(import.meta.url);
const asset = specifier => myRequire.resolve(specifier);

const makeTestContext = async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  const bundles = {
    gimix: await bundleCache.load(
      asset('../../../../src/contracts/gimix/gimix.js'),
      'gimix',
    ),
    centralSupply: await bundleCache.load(
      asset('@agoric/vats/src/centralSupply.js'),
      'centralSupply',
    ),
    postalService: await bundleCache.load(
      asset('../../../../src/contracts/gimix/postalSvc.js'),
      'postalService',
    ),
  };

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
    const { zoeService, feeMintAccess } = makeZoeKitForTest();

    // mock installBundleID
    const installBundleID = bid => {
      for (const bundle of values(bundles)) {
        if (bid === `b1-${bundle.endoZipBase64Sha512}`) {
          return zoeService.install(bundle);
        }
      }
      assert.fail(`unknown bundle ${bid}`);
    };

    const zoe = Far('ZoeService', {
      getFeeIssuer: () => zoeService.getFeeIssuer(),
      getInvitationIssuer: () => zoeService.getInvitationIssuer(),
      installBundleID,
      // @ts-expect-error mock / spread
      startInstance: (...args) => zoeService.startInstance(...args),
      // @ts-expect-error mock / spread
      getTerms: (...args) => zoeService.getTerms(...args),
      // @ts-expect-error mock / spread
      getPublicFacet: (...args) => zoeService.getPublicFacet(...args),
      // @ts-expect-error mock / spread
      offer: (...args) => zoeService.offer(...args),
    });
    const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
      makeNameHubKit();

    const invitationIssuer = await E(zoe).getInvitationIssuer();
    const invitationBrand = await E(invitationIssuer).getBrand();

    const istIssuer = await E(zoe).getFeeIssuer();
    const istBrand = await E(istIssuer).getBrand();
    const centralSupply = await E(zoeService).install(bundles.centralSupply);

    /** @type {import('@agoric/time/src/types').TimerService} */
    const chainTimerService = manualTimer;
    const timerBrand = await E(chainTimerService).getTimerBrand();

    const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
      makeNameHubKit();
    const spaces = await makeWellKnownSpaces(agoricNamesAdmin, t.log, [
      'issuer',
      'brand',
      'installation',
      'instance',
    ]);
    spaces.issuer.produce.IST.resolve(istIssuer);
    spaces.issuer.produce.Invitation.resolve(invitationIssuer);
    spaces.brand.produce.IST.resolve(istBrand);
    spaces.brand.produce.Invitation.resolve(invitationBrand);
    spaces.brand.produce.timer.resolve(timerBrand);
    spaces.installation.produce.centralSupply.resolve(centralSupply);

    const board = makeFakeBoard();
    const { rootNode, data: _todo } = makeFakeStorageKit('published');

    const { produce, consume } = makePromiseSpace();
    produce.agoricNames.resolve(agoricNames);
    produce.board.resolve(board);
    produce.chainTimerService.resolve(chainTimerService);
    produce.chainStorage.resolve(rootNode);
    produce.feeMintAccess.resolve(feeMintAccess);
    produce.namesByAddress.resolve(namesByAddress);
    produce.namesByAddressAdmin.resolve(namesByAddressAdmin);
    produce.zoe.resolve(zoe);

    /**
     * @type {BootstrapPowers}}
     */
    // @ts-expect-error mock
    const powers = { produce, consume, ...spaces };
    return powers;
  };

  const powers = await bootstrap();

  /** @param {bigint} value */
  const faucet = async value =>
    mintStablePayment(value, {
      centralSupply: powers.installation.consume.centralSupply,
      feeMintAccess: powers.consume.feeMintAccess,
      zoe: powers.consume.zoe,
    });

  return { bundles, faucet, manualTimer, powers };
};

test.before(async t => (t.context = await makeTestContext(t)));

/**
 * TODO: refactor as capabilities
 * @typedef {ReturnType<typeof makeGitHub>} GitHub
 *
 * @typedef {PromiseKit<string> & {
 *   type: 'issue',
 *   num: number,
 *   status: 'open' | 'closed'
 *   assignee?: string
 * }} IssueStatus
 * @typedef {{
 *   type: 'pull',
 *   num: number,
 *   author: string,
 *   fixes: string,
 *   status?: 'merged'
 * }} PRStatus
 */

const makeGitHub = _log => {
  /** @type {Map<string, IssueStatus | PRStatus>} */
  const status = new Map();

  const notifyIssue = (issue, pr) => {
    const st = NonNullish(status.get(issue));
    assert(st.type === 'issue');
    const { resolve } = st;
    resolve(pr);
  };

  const self = Far('github', {
    /**
     * @param {object} opts
     * @param {string} opts.owner
     * @param {string} opts.repo
     */
    openIssue: ({ owner, repo }) => {
      const num = status.size + 1;
      const issueURL = `https://github.com/${owner}/${repo}/issues/${num}`;
      const pk = makePromiseKit();
      status.set(issueURL, { ...pk, type: 'issue', num, status: 'open' });
      return issueURL;
    },
    assignIssue: (issueURL, name) => {
      const st = NonNullish(status.get(issueURL));
      assert(st.type === 'issue');
      status.set(issueURL, { ...st, assignee: name });
    },
    /** @param {string} issueURL */
    getIssuePromise: issueURL => {
      const st = NonNullish(status.get(issueURL));
      assert(st.type === 'issue');
      return st.promise;
    },
    /** @param {string} issueURL */
    closeIssue: issueURL => {
      const st = NonNullish(status.get(issueURL));
      assert(st.type === 'issue');
      status.set(issueURL, { ...st, status: 'closed' });
      // log('closed', issueURL);
    },

    /**
     * @param {object} opts
     * @param {string} opts.owner
     * @param {string} opts.repo
     * @param {string} opts.author - TODO refator as capability
     * @param {string} opts.fixes issue URL
     */
    openPR: ({ owner, repo, author, fixes }) => {
      const num = status.size + 1;
      const prURL = `https://github.com/${owner}/${repo}/pull/${num}`;
      // const pk = makePromiseKit();
      status.set(prURL, { type: 'pull', num, author, fixes });
      notifyIssue(fixes, prURL);
      return prURL;
    },
    /** @param {string} prURL */
    mergePR: prURL => {
      const st = NonNullish(status.get(prURL));
      assert(st.type === 'pull');
      status.set(prURL, { ...st, status: 'merged' });
      const { fixes } = st;
      self.closeIssue(fixes);
    },
    /** @param {string} prURL */
    queryPR: prURL => {
      const pull = NonNullish(status.get(prURL));
      assert(pull.type === 'pull');
      const issue = NonNullish(status.get(pull.fixes));
      assert(issue.type === 'issue');
      const { promise: _p, resolve: _r1, reject: _r2, ...issueData } = issue;
      return harden({ pull, issue: issueData });
    },
  });
  return self;
};

test('execute work agreement', async t => {
  const sync = {
    /** @type {PromiseKit<{jobID: string, issue: string}>} */
    assignIssue: makePromiseKit(),
    /** @type {PromiseKit<void>} */
    oracleInvited: makePromiseKit(),
    /** @type {PromiseKit<string>} */
    deliverInvitationSent: makePromiseKit(),
  };

  const { agoricNames, board } = t.context.powers.consume;
  const {
    instance: { consume: wkInstance },
    brand: { consume: wkBrand },
    issuer: { consume: wkIssuer },
  } = t.context.powers;

  /**
   * @param {ERef<GitHub>} gitHub
   * @param {SmartWallet} wallet
   * @param {PromiseKit<{jobID: string, issue: string}>} assignIssuePK
   * @param {string} timerBoardId
   * @param {bigint} dur
   * @param {bigint} bounty
   */
  const alice = async (
    gitHub,
    wallet,
    assignIssuePK,
    timerBoardId,
    dur = 21n,
    bounty = 12n,
  ) => {
    t.log('alice starts');
    const { make } = AmountMath;

    /**
     * @type {{
     *   brand: Record<string, Brand>,
     *   issuer: Record<string, Issuer>,
     *   instance: Record<string, Instance>,
     *   timer: import('@agoric/time/src/types').TimerService,
     * }}
     */
    // @ts-expect-error BootstrapPowers type is wrong?
    const pub = await deeplyFulfilledObject(
      harden({
        brand: {
          timer: wkBrand.timer,
          IST: wkBrand.IST,
          // @ts-expect-error gimix not in static WellKnownName
          GimixOracle: wkBrand.GimixOracle,
        },
        issuer: {
          IST: wkIssuer.IST,
          // @ts-expect-error gimix not in static WellKnownName
          GimixOracle: wkIssuer.GimixOracle,
        },
        instance: {
          // @ts-expect-error gimix not in static WellKnownName
          gimix: wkInstance.GiMiX,
        },
        timer: E(board).getValue(timerBoardId),
      }),
    );

    const issue = await E(gitHub).openIssue({
      owner: 'alice',
      repo: 'project1',
    });

    const give = {
      Acceptance: make(pub.brand.IST, bounty * UNIT6),
    };
    t.log('alice offers to give', give);
    const want = {
      Stamp: make(pub.brand.GimixOracle, makeCopyBag([[`Fixed ${issue}`, 1n]])),
    };
    t.log('alice wants', want);

    const t0 = await E(pub.timer).getCurrentTimestamp();
    const deadline = TimeMath.addAbsRel(
      t0,
      TimeMath.relValue(
        // @ts-expect-error Brand vs. TimerBrand
        harden({
          timerBrand: pub.brand.timer,
          relValue: dur,
        }),
      ),
    );
    const exit = { afterDeadline: { deadline, timer: pub.timer } };
    t.log('alice exit', exit);

    const gpf = await E(wallet.offers.peekZoe()).getPublicFacet(
      pub.instance.gimix,
    );
    const toMakeAgreement = await E(gpf).makeWorkAgreementInvitation(issue);
    t.log('alice invitation', toMakeAgreement);
    const { seat, result: jobID } = await wallet.offers.executeOffer(
      toMakeAgreement,
      { give, want, exit },
    );

    t.log('alice offer result job id', jobID);
    t.deepEqual(typeof jobID, 'bigint');

    const assignee = 'bob';
    await E(gitHub).assignIssue(issue, assignee);
    assignIssuePK.resolve({ jobID, issue });
    t.log('alice assigns to', assignee, 'and waits for news on', issue, '...');
    const pr = await E(gitHub).getIssuePromise(issue);
    t.log('alice merges', pr);
    await E(gitHub).mergePR(pr);

    const issuers = {
      Stamp: pub.issuer.GimixOracle,
      Acceptance: pub.issuer.IST,
    };
    const payouts = await E(seat).getPayouts();
    const amts = {};
    for await (const [kw, pmtP] of Object.entries(payouts)) {
      const pmt = await pmtP;
      const amt = await E(issuers[kw]).getAmountOf(pmt);
      t.log('alice payout', kw, amt);
      amts[kw] = amt;
    }
    t.deepEqual(amts, {
      Acceptance: make(pub.brand.IST, 0n),
      Stamp: want.Stamp,
    });
  };

  /**
   * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
   * @param {ERef<ZoeService>} zoe
   * @typedef {string} Address
   *
   * @typedef {{
   *   id: {
   *     getAddress: () => Address;
   *   };
   *   depositFacet: DepositFacet,
   *   offers: {
   *     getPurseForBrand: (brand: Brand) => Promise<Purse>,
   *     peekZoe: () => ERef<ZoeService>,
   *     executeOffer: (invitation: Invitation, proposal: Proposal, offerArgs?: any) => Promise<{seat: UserSeat, result: any}>
   *   }
   * }} SmartWallet
   */
  const makeWalletFactory = (namesByAddressAdmin, zoe) => {
    // /** @type {Map<Address, SmartWallet>} */
    // const wallets = new Map();

    /**
     * @param {Address} address
     * @param {(amt: Amount) => void} [onDeposit]
     */
    const provideWallet = async (address, onDeposit = () => {}) => {
      const purses = new Map();
      const getPurseForBrand = async brand => {
        if (purses.has(brand)) {
          return purses.get(brand);
        }
        for (const [name, candidate] of await E(
          E(agoricNames).lookup('brand'),
        ).entries()) {
          if (candidate === brand) {
            const purse = E(
              E(agoricNames).lookup('issuer', name),
            ).makeEmptyPurse();
            purses.set(brand, purse);
            return purse;
          }
        }
        throw Error('brand not found');
      };

      /** @type {DepositFacet} */
      // @ts-expect-error callWhen
      const depositFacet = Far('deposit', {
        receive: async pmt => {
          const brand = await E(pmt).getAllegedBrand();
          const purse = await getPurseForBrand(brand);
          const amt = await E(purse).deposit(pmt);
          void onDeposit(amt);
          return amt;
        },
      });

      const offers = Far('offers', {
        peekZoe() {
          return zoe;
        },
        getPurseForBrand,
        /**
         * @param {Invitation} invitation
         * @param {Proposal} proposal
         * @param {unknown} [offerArgs]
         */
        executeOffer: async (invitation, proposal, offerArgs) => {
          /** @type {Record<string, Payment>} */
          const payments = {};
          for await (const [kw, amt] of entries(proposal.give || {})) {
            const purse = await getPurseForBrand(amt.brand);
            const pmt = await E(purse).withdraw(amt);
            payments[kw] = pmt;
          }
          const seat = await E(zoe).offer(
            invitation,
            proposal,
            payments,
            offerArgs,
          );
          const result = await E(seat).getOfferResult();
          return { seat, result };
        },
      });

      const id = Far('id', { getAddress: () => address });

      const my = makeNameHubKit();
      my.nameAdmin.update('depositFacet', depositFacet);
      await E(namesByAddressAdmin).update(address, my.nameHub, my.nameAdmin);
      /** @type {SmartWallet} */
      const sw = { id, depositFacet, offers };
      return sw;
    };

    return Far('WalletFactory', { provideWallet });
  };

  /**
   * @param {SmartWallet} wallet
   * @param {ERef<GitHub>} gitHub
   * @param {Promise<void>} oracleInvited
   * @param {PromiseKit<string>} reported
   * @typedef {{
   *   deliver: (pr: string, jobID: string, deliverDepositAddr: string) => Promise<boolean>,
   * }} Oracle
   */
  const githubOracle = async (wallet, gitHub, oracleInvited, reported) => {
    t.log('githubOracle starts');
    const offerResults = new Map();

    const acceptId = 'oracleAccept1';

    const reportJobDone = async ({
      jobID,
      issueURL,
      prURL,
      deliverDepositAddr,
    }) => {
      t.log('oralce makes JobReport', { jobID, issueURL, deliverDepositAddr });
      const reporter = NonNullish(offerResults.get(acceptId));
      const toReport = await E(reporter.invitationMakers).JobReport({
        deliverDepositAddr,
        issueURL,
        jobID,
        prURL,
      });
      const { seat } = await E(wallet.offers).executeOffer(
        toReport,
        {},
        { issueURL, deliverDepositAddr },
      );
      // get payouts?
      await E(seat).tryExit();
      reported.resolve(jobID);
    };

    // oracle operator does this
    const setup = async () => {
      /** @type {Promise<Purse<'set'>>} */
      // @ts-expect-error assetkind
      const invitationPurse = wallet.offers.getPurseForBrand(
        await wkBrand.Invitation,
      );
      const amt = await E(invitationPurse).getCurrentAmount();
      t.log('oracle received invation', amt);
      const invitation = await E(invitationPurse).withdraw(amt);
      const { result: reporter } = await wallet.offers.executeOffer(
        invitation,
        { give: {}, want: {} },
      );
      t.log('oracle offer result', reporter);
      offerResults.set(acceptId, reporter);
    };

    /** @type {Oracle} */
    const it = Far('OracleWebSvc', {
      /**
       * @param {string} prURL
       * @param {string} jobID
       * @param {string} deliverDepositAddr
       */
      deliver: async (prURL, jobID, deliverDepositAddr) => {
        const { pull, issue } = await E(gitHub).queryPR(prURL);
        t.log('oracle evaluates delivery claim', jobID, { pull, issue });
        const ok =
          pull.author === issue.assignee &&
          pull.status === 'merged' &&
          issue.status === 'closed';
        if (ok) {
          await reportJobDone({
            jobID,
            prURL,
            issueURL: pull.fixes,
            deliverDepositAddr,
          });
        }
        return ok;
      },
    });

    return oracleInvited.then(async () => {
      await setup();
      return it;
    });
  };

  /**
   * @param {ERef<GitHub>} gitHub
   * @param {SmartWallet} wallet
   * @param {Promise<{jobID: string, issue: string}>} assignIssueP - issue publication
   * @param {Promise<string>} reportedP - issue reported
   * @param {ERef<Oracle>} oracle
   */
  const bob = async (gitHub, wallet, assignIssueP, reportedP, oracle) => {
    t.log('bob starts');
    const { issue, jobID } = await assignIssueP;
    const deliverDepositAddr = wallet.id.getAddress();
    const pr = await E(gitHub).openPR({
      author: 'bob',
      owner: 'alice',
      repo: 'project1',
      fixes: issue,
    });
    t.log('bob opens PR', pr);
    await null; // XXX wait for alice to close. FRAGILE
    const ok = await E(oracle).deliver(pr, jobID, deliverDepositAddr);
    t.truthy(ok);
    await reportedP;
    /** @type {Purse<'set'>} */
    // @ts-expect-error assetkind
    const invitationPurse = await E(wallet.offers).getPurseForBrand(
      await E(agoricNames).lookup('brand', 'Invitation'),
    );
    const invitationsAmt = await E(invitationPurse).getCurrentAmount();
    t.log('bob invitation balance', invitationsAmt);

    const ipmt = await E(invitationPurse).withdraw(invitationsAmt);
    const { make } = AmountMath;
    const want = { Acceptance: make(await wkBrand.IST, 12n * UNIT6) };
    const { seat, result } = await E(wallet.offers).executeOffer(ipmt, {
      give: {},
      want,
    });
    t.log('bob accepts deliver invitation', seat, result);

    const issuers = { Acceptance: await wkIssuer.IST };
    const payouts = await E(seat).getPayouts();
    const amts = {};
    for await (const [kw, pmtP] of Object.entries(payouts)) {
      const pmt = await pmtP;
      const amt = await E(issuers[kw]).getAmountOf(pmt);
      t.log('bob payout', kw, amt);
      amts[kw] = amt;
    }
    t.deepEqual(amts, want);
  };

  const gitHub = Promise.resolve(makeGitHub(t.log));
  const {
    faucet,
    powers: {
      consume: { zoe, namesByAddressAdmin, chainTimerService },
    },
  } = t.context;
  const wf = makeWalletFactory(namesByAddressAdmin, zoe);

  const wallet = {
    alice: await wf.provideWallet('agoric1alice'),
    oracle: await wf.provideWallet('agoric1oracle'),
    bob: await wf.provideWallet('agoric1bob'),
  };

  const { bundles, powers } = t.context;
  await startPostalSvc(powers, {
    options: {
      postalSvc: {
        bundleID: `b1-${bundles.postalService.endoZipBase64Sha512}`,
      },
    },
  });
  await startGiMiX(powers, {
    options: {
      GiMiX: {
        bundleID: `b1-${bundles.gimix.endoZipBase64Sha512}`,
        oracleAddress: 'agoric1oracle',
      },
    },
  });
  sync.oracleInvited.resolve();

  wallet.alice.depositFacet.receive(await faucet(25n * UNIT6));
  const oracleSvc = githubOracle(
    wallet.oracle,
    gitHub,
    sync.oracleInvited.promise,
    sync.deliverInvitationSent,
  );
  const timer = await chainTimerService;
  const timerBoardId = await E(board).getId(timer);
  await Promise.all([
    alice(gitHub, wallet.alice, sync.assignIssue, timerBoardId),
    bob(
      gitHub,
      wallet.bob,
      sync.assignIssue.promise,
      sync.deliverInvitationSent.promise,
      oracleSvc,
    ),
  ]);
  t.log('done');
  t.pass();
});

test('GimixOracle brandAux marshal re-implementation', t => {
  const smallcaps = /** @type {const} */ ({
    serializeBodyFormat: 'smallcaps',
  });
  const marshalData = makeMarshal(
    _val => Fail`data only`,
    undefined,
    smallcaps,
  );
  const displayInfo = { assetKind: 'copyBag' };
  const allegedName = 'GimixOracle';
  const capData = marshalData.toCapData(harden({ displayInfo, allegedName }));

  t.is(JSON.stringify(capData), oracleBrandAuxValue);
});

test.todo('make work agreement at wallet bridge / vstorage level');
