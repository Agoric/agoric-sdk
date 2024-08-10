#!/usr/bin/env node
// @ts-nocheck XXX
/* eslint no-labels: "off", no-extra-label: "off", no-underscore-dangle: "off" */
import process from 'process';
import sqlite3 from 'better-sqlite3';
import yargsParser from 'yargs-parser';
import '@endo/init/debug.js';
import { makeStandinPromise, krefOf } from '@agoric/kmarshal';
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { M, matches, mustMatch } from '@endo/patterns';

const EX_USAGE = 64;
const {
  BRIDGE_VAT_ID = 'v10',
  WALLET_FACTORY_VAT_ID = 'v43',
  ZOE_VAT_ID = 'v9',
  VAT_ADMIN_SERVICE_KREF = 'ko25',
  ZOE_SERVICE_KREF = 'ko65',
} = process.env;
const VAT_NAME_PATTERNS = {
  governor: /^zcf-b1-9f877-(?<subject>.*)[.-]governor$/,
  mintHolder: /^zcf-mintHolder-(?<for>.*)$/,
  psm: /^zcf-b1-c25fb-psm-(?<pair>.*)$/,
  voteCounter: /^zcf-b1-78999-voteCounter[.](?<deadline>.*)$/,
};

const krefIsPromise = kref => kref.match(/^[klr]?p/);

// CapData decoding that exposes slot data (e.g., promise/remotable krefs).
const { toCapData, fromCapData, getPresence } = (() => {
  const presences = new Map();
  // eslint-disable-next-line no-shadow
  const getPresence = kref => {
    const p = presences.get(kref);
    assert(p !== undefined);
    return p;
  };
  // cf. kunser
  const slotToPresence = (kref, iface = 'undefined') => {
    const found = presences.get(kref);
    if (found) return found;

    assert.typeof(kref, 'string');
    const p = krefIsPromise(kref)
      ? makeStandinPromise(kref)
      : Far(iface.replace(/^Alleged: /, ''), {
          iface: () => iface,
          getKref: () => kref,
        });
    presences.set(kref, p);
    return p;
  };
  // eslint-disable-next-line no-shadow
  const { toCapData, fromCapData } = makeMarshal(undefined, slotToPresence, {
    serializeBodyFormat: 'smallcaps',
  });
  return { toCapData, fromCapData, getPresence };
})();
const describeCapData = capData => {
  const data = fromCapData(capData);
  const { slots } = capData;
  const presences = slots.map(kref => getPresence(kref));
  return harden({ data, slots, presences });
};

const capDataShape = M.splitRecord({ slots: M.array() });
const makeSyscallShape = type =>
  M.splitRecord({ type, vatID: M.string(), ksc_json: M.string() });
/**
 * @param {PropertyKey} methodName
 * @param {unknown[] | import('@endo/patterns').Matcher} argsShape
 * @returns {import('@endo/patterns').Pattern}
 */
const makeMethargsShape = (methodName, argsShape = M.arrayOf(M.any())) =>
  harden([methodName, argsShape]);

// A syscall sequence of minimum length 2 in which the first is a send and it is
// followed by a subscribe (presumably to the result of the first).
const sendAndSubscribeShape = M.splitArray([
  makeSyscallShape('send'),
  makeSyscallShape('subscribe'),
]);

// syscall.send: ['send', targetKref, message: { methargs: capData, result?: kpid }]
const kscSendShape = harden([
  'send',
  M.string(),
  M.splitRecord({ methargs: capDataShape }, { result: M.string() }),
]);
const decodeSendSyscall = syscall => {
  const ksc = harden(JSON.parse(syscall.ksc_json));
  mustMatch(ksc, kscSendShape);
  const [_syscallType, targetKref, message] = ksc;
  const {
    data: methargs,
    slots: methargsSlots,
    presences: methargsPresences,
  } = describeCapData(message.methargs);
  const { result: resultKpid } = message;
  return harden({
    sourceVatID: syscall.vatID,
    targetKref,
    methargs,
    methargsSlots,
    methargsPresences,
    resultKpid,
  });
};

// syscall.subscribe: ['subscribe', vatID, kpid]
const kscSubscribeShape = harden(['subscribe', M.string(), M.string()]);
const decodeSubscribeSyscall = syscall => {
  const ksc = harden(JSON.parse(syscall.ksc_json));
  mustMatch(ksc, kscSubscribeShape);
  const [_syscallType, _vatID, kpid] = ksc;
  return harden({ sourceVatID: syscall.vatID, kpid });
};

// syscall.resolve: ['resolve', vatID, settlements: Array<[kpid, isRejection, capData]>]
const kscResolveShape = harden([
  'resolve',
  M.string(),
  M.arrayOf([M.string(), M.boolean(), capDataShape]),
]);
const decodeResolveSyscall = syscall => {
  const ksc = harden(JSON.parse(syscall.ksc_json));
  mustMatch(ksc, kscResolveShape);
  const [_syscallType, _vatID, encodedSettlements] = ksc;
  const settlements = encodedSettlements.map(([kpid, isRejection, capData]) => {
    const { data, slots, presences } = describeCapData(capData);
    return { kpid, isRejection, data, slots, presences };
  });
  return harden({ sourceVatID: syscall.vatID, settlements });
};

/**
 * @typedef {object} SyscallTraceData
 * @property {Array<string>} krefHistory
 * @property {Array<ReturnType<decodeSendSyscall | decodeResolveSyscall>>} syscalls
 */
/** @typedef {SyscallTraceData & {failure: string}} SyscallTraceFailure */
/** @typedef {SyscallTraceData & {useRecord?: ReturnType<describeCapData>, request: ReturnType<decodeSendSyscall>}} SyscallTraceSuccess */

/**
 * Given a function for querying syscall data and a kref of interest, traces
 * mentions to find an originating syscall.send request.
 *
 * If successful, it also returns a "use record" (if any) describing CapData
 * containing the kref or an ancestor (e.g., the use record for a vat admin node
 * describes the { root, adminNode } fulfillment of the
 * `E(vatAdminService).createVat(...)` call that created it, and the use record
 * for a `E(purse).getCurrentAmountNotifier()` kpid is its fulfillment).
 *
 * If unsuccessful, it returns a `failure` message.
 *
 * In either case, it also returns a reverse-sorted `krefHistory` and a
 * forward-sorted `syscalls` list representing the trace.
 *
 * @param {import('better-sqlite3').Statement<[kpid: string]>} getSyscallsForKref
 * @param {string} kref
 * @returns {SyscallTraceFailure | SyscallTraceSuccess}
 */
const traceSyscalls = (getSyscallsForKref, kref) => {
  const krefHistory = [kref];
  let syscalls = [];
  let useRecord;
  /** @type {string | undefined} */
  let pendingKref = kref;
  nextKref: while (pendingKref) {
    const currentKref = pendingKref;
    pendingKref = undefined;
    /** @type {any[]} */
    const moreSyscalls = getSyscallsForKref.all(currentKref);
    for (let i = 0; i < moreSyscalls.length; i += 1) {
      const syscall = moreSyscalls[i];
      const makeResult = fields => {
        const updatedSyscalls = [...moreSyscalls.slice(0, i + 1), ...syscalls];
        return { ...fields, krefHistory, syscalls: updatedSyscalls };
      };
      if (syscall.type === 'send') {
        const decoded = decodeSendSyscall(syscall);
        if (decoded.resultKpid === currentKref) {
          // End of the line!
          return harden(makeResult({ useRecord, request: decoded }));
        } else if (decoded.methargsSlots.includes(currentKref)) {
          // currentKref is being sent to another vat. Make sure this is unique
          // (just for simplicity of description, not because it must be) and
          // record details of the containing CapData.
          if (useRecord) {
            const failureContext = `${kref}/${currentKref} at syscall ${i}`;
            const failure = `cannot handle multiple syscall bodies for ${failureContext}`;
            return harden(makeResult({ failure }));
          }
          useRecord = {
            data: decoded.methargs,
            slots: decoded.methargsSlots,
            presences: decoded.methargsPresences,
          };
          // If currentKref does not identify a promise, then this is its introduction.
          if (!krefIsPromise(currentKref)) {
            return harden(makeResult({ useRecord, request: decoded }));
          }
          continue;
        }
        return harden(makeResult({ failure: `unexpected syscall.send` }));
      } else if (syscall.type === 'resolve') {
        const decoded = decodeResolveSyscall(syscall);
        const settlement = decoded.settlements.find(
          ({ kpid, slots }) =>
            kpid === currentKref || slots.includes(currentKref),
        );
        if (settlement.kpid === currentKref) {
          // currentKref is a kpid being settled by this syscall.resolve.
          // If the settlement mentions exactly one kref, we can extend the
          // trace to it.
          if (settlement.slots.length !== 1) {
            const failure = `cannot handle non-remotable resolution at syscall ${i}`;
            return harden(makeResult({ failure }));
          }
          syscalls = makeResult().syscalls;
          pendingKref = /** @type {string} */ (settlement.slots[0]);
          krefHistory.push(pendingKref);
          continue nextKref;
        } else {
          // currentKref is part of the settlement.
          // Extend the trace back to the kpid being settled, and also record
          // details of the containing settlement if this is the first chance to
          // do so.
          if (!useRecord) useRecord = settlement;
          syscalls = makeResult().syscalls;
          pendingKref = /** @type {string} */ (settlement.kpid);
          krefHistory.push(pendingKref);
          continue nextKref;
        }
      }
    }
    syscalls = [...moreSyscalls, ...syscalls];
  }
  return harden({ failure: `trace truncated`, krefHistory, syscalls });
};

const installBundleShape = M.splitRecord({
  targetKref: ZOE_SERVICE_KREF,
  methargs: makeMethargsShape('installBundleID', M.splitArray([M.string()])),
});
const extractInstallationBundleID = syscall => {
  if (!matches(syscall, installBundleShape)) return undefined;
  return syscall.methargs[1][0];
};
const publicationRecordShape = harden({
  publishCount: M.bigint(),
  head: { done: M.boolean(), value: M.any() },
  tail: M.promise(),
});
const startContractShape = M.splitRecord({
  sourceVatID: ZOE_VAT_ID,
  targetKref: VAT_ADMIN_SERVICE_KREF,
  methargs: makeMethargsShape('createVat', [
    M.remotable('zcfBundleCap'),
    {
      name: M.string(),
      vatParameters: M.splitRecord({ contractBundleCap: M.remotable() }),
    },
  ]),
});
const startZcfShape = M.splitRecord({
  sourceVatID: ZOE_VAT_ID,
  methargs: makeMethargsShape(
    'startZcf',
    M.splitArray([
      M.remotable('zoeInstanceAdmin'),
      // InstanceRecord
      {
        installation: M.remotable(),
        instance: M.remotable(),
        terms: M.record(),
      },
    ]),
  ),
});

/** methargs for Zoe UserSeat `getOfferResult()`/`getPayouts()`/`numWantsSatisfied()` */
const methargsZoeSeatMethodShape = harden([
  M.or('getOfferResult', 'getPayouts', 'numWantsSatisfied'),
  [],
]);

/**
 * Searches for and decodes the syscall.send whose result corresponds with a provided kpid,
 * or explains failure to do so.
 *
 * @param {import('better-sqlite3').Statement<[kpid: string]>} getSyscallsForKref
 * @param {string} kpid
 * @returns {{failure: string, kpidSyscalls: unknown[]} | ReturnType<decodeSendSyscall>}
 */
const getSendForResultKpid = (getSyscallsForKref, kpid) => {
  const kpidSyscalls = harden(getSyscallsForKref.all(kpid));
  const nonVatstoreSyscalls = harden(
    kpidSyscalls.filter(({ type }) => !type.startsWith('vatstore')),
  );
  if (!matches(nonVatstoreSyscalls, sendAndSubscribeShape)) {
    return { failure: 'not send+subscribe', kpidSyscalls };
  }
  const sendSyscall = decodeSendSyscall(kpidSyscalls[0]);
  if (sendSyscall.resultKpid !== kpid) {
    return { failure: 'not a send result kpid', kpidSyscalls };
  }
  const subscribeSyscall = decodeSubscribeSyscall(nonVatstoreSyscalls[1]);
  if (subscribeSyscall.kpid !== kpid) {
    return { failure: 'missing subscription', kpidSyscalls };
  }
  return sendSyscall;
};

const main = rawArgv => {
  const { _: args, ...options } = yargsParser(rawArgv.slice(2));
  if (Reflect.ownKeys(options).length > 0 || args.length !== 1) {
    const envVars = Object.entries({
      BRIDGE_VAT_ID,
      WALLET_FACTORY_VAT_ID,
      ZOE_VAT_ID,
      VAT_ADMIN_SERVICE_KREF,
      ZOE_SERVICE_KREF,
    });
    const q = str => `'${str.replaceAll("'", String.raw`'\''`)}'`;
    console.error(
      [
        `Usage: ${rawArgv[1]} /path/to/mezzanine-db.sqlite`,
        'Classifies unsettled promises into known patterns.',
        '',
        'ENVIRONMENT',
        envVars.map(([name, value]) => `  ${name}=${q(value)}`).join('\n'),
      ].join('\n'),
    );
    process.exitCode = EX_USAGE;
    return;
  }

  const [dbPath] = args;
  const db = sqlite3(/** @type {string} */ (dbPath));
  /** @type {any} */
  const getUnsettledPromises = db.prepare(`
      SELECT d.kpid, d.decider, s.subscriber
        FROM promise_decider AS d
             INNER JOIN promise_subscriber AS s USING (kpid)
    ORDER BY 0+substring(d.kpid, 3)
  `);
  const getSyscallsForKref = db.prepare(`
      SELECT s.*
        FROM syscall_mention AS m
             INNER JOIN syscall AS s USING (crankNum, syscallNum)
       WHERE m.kref = ?
    ORDER BY crankNum, syscallNum
  `);
  const _getDeliveriesForKref = db.prepare(`
      SELECT d.*
        FROM delivery_mention AS m
             INNER JOIN delivery AS d USING (crankNum)
       WHERE m.kref = ?
    ORDER BY crankNum
  `);

  nextPromise: for (const {
    kpid,
    decider,
    subscriber,
  } of getUnsettledPromises.all()) {
    /**
     * Reports the classification of this kpid.
     *
     * @param {string} type
     * @param {unknown} details
     */
    const classify = (type, details = undefined) => {
      // Make `details` JSON-representable without affecting shallow object key order.
      if (typeof details === 'object' && details !== null) {
        details = Object.fromEntries(
          JSON.parse(toCapData(harden(Object.entries(details))).body.slice(1)),
        );
      } else if (details !== undefined) {
        details = JSON.parse(toCapData(harden(details)).body.slice(1));
      }
      console.log(JSON.stringify({ kpid, decider, subscriber, type, details }));
    };

    const sendData = getSendForResultKpid(getSyscallsForKref, kpid);
    // @ts-expect-error destructuring of union type
    const { kpidSyscalls, targetKref, methargs, resultKpid } = sendData;
    // @ts-expect-error destructuring of union type
    const { failure: decodeSendFailure } = sendData;
    if (decodeSendFailure) {
      // kpid does not identify syscall.send results, but it might be the tail promise of a PublishKit.
      const trace = /** @type {SyscallTraceSuccess} */ (
        traceSyscalls(getSyscallsForKref, kpid)
      );
      if (
        trace.request?.methargs[0] === 'subscribeAfter' &&
        matches(trace.useRecord?.data, publicationRecordShape) &&
        krefOf(trace.useRecord?.data.tail) === kpid
      ) {
        classify('unknown PublishKit tail', {
          subscribeRequest: trace.request,
          containingResult: trace.useRecord,
        });
        continue nextPromise;
      }
      classify(`unknown - ${decodeSendFailure}`, { kpidSyscalls, trace });
      continue nextPromise;
    }
    // kpid corresponds with the results of a syscall.send.

    if (matches(methargs, makeMethargsShape('done', []))) {
      // kpid identifies `E(target).done()` results.
      // Let's see if target is the adminNode of a contract vat created by Zoe, and if so identify the contract.
      // @ts-expect-error destructuring of union type
      const { failure, krefHistory, syscalls, request, useRecord } =
        /** @type {SyscallTraceSuccess} */ (
          traceSyscalls(getSyscallsForKref, targetKref)
        );
      if (
        !failure &&
        matches(request, startContractShape) &&
        useRecord &&
        krefOf(useRecord.data.adminNode) === targetKref
      ) {
        const [_createVat, createVatArgs] = request.methargs;
        const [
          _zcfBundleCapPresence,
          { name: vatName, vatParameters: _vatParameters },
        ] = createVatArgs;
        for (const [pattern, re] of Object.entries(VAT_NAME_PATTERNS)) {
          const match = vatName && vatName.match(re);
          if (match) {
            classify(
              `Zoe E(${pattern} contractInstanceAdminNode).done()`,
              match.groups,
            );
            continue nextPromise;
          }
        }
        classify(`Zoe E(contractInstanceAdminNode).done()`, { vatName });
        continue nextPromise;
      }
      classify(`unknown E(...).done()`, { failure, krefHistory, syscalls });
      continue nextPromise;
    } else if (
      matches(
        methargs,
        makeMethargsShape(
          'getUpdateSince',
          M.or([], [M.bigint()], [M.number()]),
        ),
      )
    ) {
      // kpid corresponds with the results of a `getUpdateSince()` call on targetKref.
      // @ts-expect-error destructuring of union type
      const { failure, krefHistory, syscalls, request, useRecord } =
        /** @type {SyscallTraceSuccess} */ (
          traceSyscalls(getSyscallsForKref, targetKref)
        );
      const walletNotifierRequestShape = M.splitRecord({
        sourceVatID: WALLET_FACTORY_VAT_ID,
        methargs: makeMethargsShape('getCurrentAmountNotifier'),
      });
      const getExitSubscriberShape = M.splitRecord({
        methargs: makeMethargsShape('getExitSubscriber', [
          M.remotable('SeatHandle'),
        ]),
      });
      if (
        !failure &&
        matches(request, walletNotifierRequestShape) &&
        matches(useRecord?.data, M.remotable()) &&
        useRecord?.data.iface() === 'Alleged: notifier'
      ) {
        // targetKref identifies a current amount notifier requested by the wallet factory.
        classify(
          'WalletFactory E(likelyPurse).getCurrentAmountNotifier(...) .getUpdateSince(...)',
          { likelyPurseKref: request.targetKref },
        );
        continue nextPromise;
      } else if (
        !failure &&
        request.sourceVatID === subscriber &&
        matches(request, getExitSubscriberShape) &&
        request.methargsPresences[0]?.iface() === 'Alleged: SeatHandle'
      ) {
        // targetKref identifies the result of a `getExitSubscriber(...)` call,
        // presumably against a zoeInstanceAdmin.
        // Let's investigate the latter.
        const targetTrace = /** @type {SyscallTraceSuccess} */ (
          traceSyscalls(getSyscallsForKref, request.targetKref)
        );
        let installationTrace;
        if (
          matches(targetTrace.request, startZcfShape) &&
          krefOf(targetTrace.request.methargs[1][0]) === request.targetKref
        ) {
          const [_zoeInstanceAdmin, { installation }] =
            targetTrace.request.methargs[1];
          installationTrace = traceSyscalls(
            getSyscallsForKref,
            krefOf(installation),
          );
          const contractBundleID = extractInstallationBundleID(
            // @ts-expect-error `request` may be missing
            installationTrace.request,
          );
          if (contractBundleID) {
            classify(
              'E(zoeInstanceAdmin).getExitSubscriber(likelySeatHandle) .getUpdateSince(...)',
              { contractBundleID },
            );
            continue nextPromise;
          }
        }
        classify(
          'unknown E(likelyZoeInstanceAdmin).getExitSubscriber(likelySeatHandle) .getUpdateSince(...)',
          { targetKref, targetTrace, installationTrace },
        );
        continue nextPromise;
      }
      const targetIface =
        useRecord?.data && useRecord.data === useRecord.presences[0]
          ? useRecord.presences[0].iface()
          : undefined;
      classify(
        `unknown E(${
          targetIface ? `<${targetIface}>` : '...'
        }).getUpdateSince(...)`,
        {
          targetKref,
          failure,
          krefHistory,
          syscalls,
          request,
          useRecord,
        },
      );
      continue nextPromise;
    } else if (matches(methargs, methargsZoeSeatMethodShape)) {
      // kpid corresponds with the results of a method call on targetKref that looks like a Zoe seat method.
      const {
        // @ts-expect-error destructuring of union type
        failure,
        krefHistory: _krefHistory,
        syscalls: _syscalls,
        request,
      } = /** @type {SyscallTraceSuccess} */ (
        traceSyscalls(getSyscallsForKref, targetKref)
      );
      if (
        !failure &&
        matches(
          request,
          M.splitRecord({
            targetKref: ZOE_SERVICE_KREF,
            methargs: makeMethargsShape('offer'),
          }),
        )
      ) {
        // targetKref does indeed identify a Zoe seat. Onward and upward...
        const [invitationPresence] = request.methargs[1];
        const providedInvitationKpid = krefOf(invitationPresence);
        const trace = /** @type {SyscallTraceSuccess} */ (
          traceSyscalls(getSyscallsForKref, providedInvitationKpid)
        );
        if (
          matches(
            trace.request?.methargs,
            makeMethargsShape('makeInvitation', [
              M.remotable(),
              M.string(),
              M.any(),
              M.pattern(),
            ]),
          )
        ) {
          const {
            sourceVatID: invitationSourceVatID,
            targetKref: invitationCreatorKref,
            resultKpid: invitationKpid,
          } = trace.request;
          classify(`E(ZoeSeat)[${methargs[0]}](...)`, {
            invitationSourceVatID,
            invitationCreatorKref,
            invitationKpid,
          });
          continue nextPromise;
        }
        classify(`unknown E(ZoeSeat)[${methargs[0]}](...)`, { trace });
        continue nextPromise;
      }
    } else if (
      subscriber === BRIDGE_VAT_ID &&
      decider === WALLET_FACTORY_VAT_ID &&
      matches(
        methargs,
        makeMethargsShape('fromBridge', [
          M.splitRecord({
            type: 'WALLET_SPEND_ACTION',
            owner: M.string(),
            spendAction: M.string(),
          }),
        ]),
      )
    ) {
      // kpid corresponds with the results of a wallet spend action sent from the bridge vat to the wallet factory.
      const spendAction = fromCapData(
        harden(JSON.parse(methargs[1][0].spendAction)),
      );
      classify(
        `wallet spend action: ${spendAction?.method || '<unknown method>'}`,
        { ...methargs[1][0], spendAction },
      );
      continue nextPromise;
    }
    classify(`unknown send result E(...)[${String(methargs[0])}](...)`, {
      targetKref,
      methargs,
      resultKpid,
    });
    continue nextPromise;
  }
};

main(process.argv);
