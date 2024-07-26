/**
 * @file A proposal to start the evaluator contract.
 */
import { makeTracer, WalletName } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E, Far } from '@endo/far';
import { heapVowTools as vowTools } from '@agoric/vow/vat.js';

const { Fail } = assert;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @import {AgoricEvaluatorSF} from '../evaluator.contract.js';
 */

const trace = makeTracer('StartAgoricEvaluator', true);
const contractName = 'agoricEvaluator';

const createAsyncFunction = (ev, body) => {
  try {
    // Try an expression first.
    return ev(`async () => (${body}\n)`);
  } catch (e) {
    if (e instanceof SyntaxError) {
      try {
        // Evaluate statements instead.
        return ev(`async () => { ${body}\n}`);
      } catch (e2) {
        if (e2 instanceof SyntaxError) {
          throw e;
        }
        throw e2;
      }
    } else {
      throw e;
    }
  }
};

const makeEvaluator = powers => {
  let ev;
  return Far('evaluator', {
    async evaluate(code) {
      assert.typeof(code, 'string');
      if (!ev) {
        const compartment = new Compartment({
          powers,
          console,
          E,
          Far,
          vowTools,
        });

        ev = cmd => compartment.evaluate(cmd, { sloppyGlobalsMode: true });
      }

      const afn = createAsyncFunction(ev, code);
      return afn();
    },
  });
};

/**
 * See `../evaluator.build.js` for the accompanying proposal builder. Run
 * `agoric run ../evaluator.build.js` to build the contract and proposal files.
 *
 * @param {BootstrapPowers} powers
 * @param {object} root0
 * @param {object} root0.options
 * @param {Record<string, string>} root0.options.invitedOwners
 */
export const startAgoricEvaluator = async (
  powers,
  { options: { invitedOwners } },
) => {
  console.error('@@@@ startAgoricEvaluator!!!');
  const {
    consume: { board, chainStorage, startUpgradable, namesByAddressAdmin },
    installation: {
      // @ts-expect-error not a WellKnownName
      consume: { [contractName]: installation },
    },
    instance: {
      // @ts-expect-error not a WellKnownName
      produce: { [contractName]: produceInstance },
    },
  } = powers;
  trace(`start ${contractName}`);
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = {
    evaluator: makeEvaluator(powers),
    storageNode,
    marshaller,
  };

  /** @type {StartUpgradableOpts<AgoricEvaluatorSF>} */
  const startOpts = {
    label: contractName,
    installation,
    terms: undefined,
    privateArgs,
  };

  const { instance, creatorFacet } = await E(startUpgradable)(startOpts);
  produceInstance.reset();
  produceInstance.resolve(instance);
  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const debugName = `audit member ${addr}`;
        // eslint-disable-next-line no-use-before-define
        await reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
          invitationP,
        ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
      }),
    );
  };
  const invitationPs = Object.keys(invitedOwners).map(name => {
    console.log('creating invitation for', name);
    return E(creatorFacet).makeEvaluatorInvitation(name);
  });
  void distributeInvitations(zip(Object.values(invitedOwners), invitationPs));
};
harden(startAgoricEvaluator);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startAgoricEvaluator.name]: true,
    },
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options,
  };
};

/**
 * @param {ERef<import('@agoric/vats').NameAdmin>} nameAdmin
 * @param {string[][]} paths
 */
const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   * @param {ERef<import('@agoric/vats').NameAdmin>} nextAdmin
   * @param {string[]} path
   */
  const nextPath = async (nextAdmin, path) => {
    const [nextName, ...rest] = path;
    assert.typeof(nextName, 'string');

    // Ensure we wait for the next name until it exists.
    await E(nextAdmin).reserve(nextName);

    if (rest.length === 0) {
      // Now return the readonly lookup of the name.
      const nameHub = E(nextAdmin).readonly();
      return E(nameHub).lookup(nextName);
    }

    // Wait until the next admin is resolved.
    const restAdmin = await E(nextAdmin).lookupAdmin(nextName);
    return nextPath(restAdmin, rest);
  };

  return Promise.all(
    paths.map(async path => {
      Array.isArray(path) || Fail`path ${path} is not an array`;
      return nextPath(nameAdmin, path);
    }),
  );
};

/**
 * @param {string} debugName
 * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
 * @param {string} addr
 * @param {ERef<Payment>[]} payments
 */
const reserveThenDeposit = async (
  debugName,
  namesByAddressAdmin,
  addr,
  payments,
) => {
  console.info('awaiting depositFacet for', debugName);
  const [depositFacet] = await reserveThenGetNamePaths(namesByAddressAdmin, [
    [addr, WalletName.depositFacet],
  ]);
  console.info('depositing to', debugName);
  await Promise.allSettled(
    payments.map(async (paymentP, i) => {
      const payment = await paymentP;
      await E(depositFacet).receive(payment);
      console.info(
        `confirmed deposit ${i + 1}/${payments.length} for`,
        debugName,
      );
    }),
  );
};
