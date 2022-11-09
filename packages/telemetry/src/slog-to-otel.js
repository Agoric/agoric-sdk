import otel, { SpanStatusCode } from '@opentelemetry/api';

import { makeLegacyMap } from '@agoric/store';
import {
  makeKVStringStore,
  makeTempKVDatabase,
  makeKVDatabaseTransactionManager,
} from './kv-string-store.js';

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);

/** @typedef {import('@opentelemetry/api').Span} Span */
/** @typedef {import('@opentelemetry/api').Link} SpanLink */
/** @typedef {import('@opentelemetry/api').SpanContext} SpanContext */
/** @typedef {import('@opentelemetry/api').SpanOptions} SpanOptions */
/** @typedef {import('@opentelemetry/api').SpanAttributes} SpanAttributes */

const replacer = (_key, value) => {
  if (typeof value === 'bigint') {
    // Use Protobuf JSON convention: replace bigint with string.
    // return `${value}`;
    // Use rounding convention: replace bigint with number.
    return Number(value);
  }

  if (value === null) {
    return undefined;
  }

  return value;
};

const serializeInto = (value, prefix, target = {}, depth = 3) => {
  value = replacer(prefix, value);
  if (typeof value === 'object') {
    if (depth > 0) {
      depth -= 1;
      if (Array.isArray(value)) {
        if (value.length) {
          Array.prototype.forEach.call(value, (nested, index) =>
            serializeInto(nested, `${prefix}.${index}`, target, depth),
          );
          return target;
        }
      } else {
        const proto = Object.getPrototypeOf(value);
        if (proto == null || proto === Object.prototype) {
          Object.entries(value).forEach(([key, nested]) =>
            serializeInto(nested, `${prefix}.${key}`, target, depth),
          );
          return target;
        }
      }
    }
    // Fell-through, simply stringify
    value = JSON.stringify(value, replacer);
  }
  target[prefix] = value;
  return target;
};

/**
 * @param {number} sFloat
 * @returns {[number, number]}
 */
export const floatSecondsToHiRes = sFloat => {
  const sInt = Math.trunc(sFloat);
  const ns = Number((sFloat - sInt).toFixed(9)) * 1e9;
  return [sInt, ns];
};

/**
 * @param {import('@opentelemetry/api').Tracer} tracer
 * @param {Record<string, any>} [overrideAttrs]
 */
export const makeSlogToOtelKit = (tracer, overrideAttrs = {}) => {
  let now;
  let nowFloat;
  /** @type {Record<string, any>} */
  let currentAttrs = {};

  let isReplaying = false;

  const cleanAttrs = attrs => ({
    ...serializeInto(attrs, 'agoric'),
    ...overrideAttrs,
  });

  /** @type {LegacyMap<string, Record<string, any>>} */
  const vatIdToAttrs = makeLegacyMap('vatId');

  /**
   * @typedef {{
   *   context: SpanContext, name: string, error?: string, attrs?: Record<string, string>
   * }} Cause
   */
  /** @type {LegacyMap<any, Cause>} */
  const crankNumToCause = makeLegacyMap('crankNum');

  const db = makeTempKVDatabase();
  const dbTransactionManager = makeKVDatabaseTransactionManager(db);
  const kernelPromiseToSendingCause = makeKVStringStore('kernelPromise', db);

  const extractMethod = methargs => JSON.parse(methargs.body)[0];

  const cleanVatParameters = vatParameters => {
    if (!vatParameters || !vatParameters.slots) {
      return undefined;
    }
    return { slots: vatParameters.slots.join(',') };
  };

  const extractMessageAttrs = ({ type: messageType, ...message }) => {
    /** @type {Record<string, any>} */
    const attrs = { 'message.type': messageType, ...message };
    const links = [];
    let name = messageType;
    switch (messageType) {
      case 'create-vat': {
        if (attrs.source.bundle) {
          attrs.source = { ...attrs.source, bundle: '*elided*' };
        }
        attrs.vatParameters = cleanVatParameters(attrs.vatParameters);
        break;
      }
      case 'send': {
        name = 'message';
        // TODO: The arguments to a method call can be pretty big.
        delete attrs.msg;
        const { methargs, method = extractMethod(methargs) } = message.msg;
        const slots =
          message.msg.methargs?.slots ?? message.msg.args.slots ?? [];
        attrs.details = `E(${message.target}).${method}`;
        attrs['msg.target'] = message.target;
        attrs['msg.method'] = method;
        attrs['msg.slots'] = slots.join(',');
        attrs['msg.result'] = message.msg.result;
        break;
      }
      case 'notify': {
        const { kpid } = attrs;
        if (kernelPromiseToSendingCause.has(kpid)) {
          // Track this crank as a consequence of a kernel promise.
          const cause = JSON.parse(kernelPromiseToSendingCause.get(kpid));
          links.push({
            attributes: { cause: cause.name },
            context: cause.context,
          });
        }
        break;
      }
      case 'startVat': {
        // The vat parameters can be pretty big
        attrs.vatParameters = cleanVatParameters(attrs.vatParameters);
        break;
      }
      case 'stopVat':
      case 'dropExports':
      case 'retireExports':
      case 'retireImports':
      case 'bringOutYourDead': {
        // Use all the attrs.
        break;
      }
      default: {
        console.error(`Unknown crank-start message.type`, messageType);
      }
    }
    return [name, attrs, links];
  };

  const makeSpans = () => {
    /**
     * @typedef {object} SpanRecord
     * @property {Span} span
     * @property {string} name
     * @property {string} kind
     * @property {string} key
     */

    /** @type {LegacyMap<string, SpanRecord>} */
    // Legacy because spans are not passable
    const keyToSpan = makeLegacyMap('spanKey');

    let lastAssertedKindPopTime;

    /** @type {SpanRecord[]} */
    const spanStack = [];

    const makeSpanKey = keyArray => JSON.stringify(keyArray, replacer);

    const sp = harden({
      endAll: endTime => {
        for (const { span } of keyToSpan.values()) {
          span.end(endTime);
        }
        keyToSpan.clear();
      },

      /**
       * @param {string} name
       * @param {Span} [parent]
       * @param {Record<string, any>} [attrs]
       * @param {SpanOptions} [options]
       */
      create: (
        name,
        parent = undefined,
        attrs = currentAttrs,
        options = {},
      ) => {
        const ctx = parent && otel.trace.setSpan(otel.context.active(), parent);
        const allOpts = { ...options };
        const links = allOpts.links ? [...allOpts.links] : [];

        if (vatIdToAttrs.has(attrs.vatID)) {
          attrs = { ...attrs, vatName: vatIdToAttrs.get(attrs.vatID).name };
        }

        // Clean the attributes as necessary.
        allOpts.links = links.map(link => ({
          ...link,
          attributes: link.attributes && cleanAttrs(link.attributes),
        }));
        allOpts.attributes = {
          ...overrideAttrs,
          ...cleanAttrs({ ...allOpts.attributes, ...attrs }),
        };
        if (!allOpts.startTime) {
          allOpts.startTime = now;
        }
        return tracer.startSpan(name, allOpts, ctx);
      },

      /**
       * @param {string} name
       * @param {any[]} keyArray
       * @param {Span} [parent]
       * @param {Record<string, any>} [attrs]
       * @param {SpanOptions} [options]
       */
      startNamed: (
        name,
        keyArray,
        parent = undefined,
        attrs = currentAttrs,
        options = {},
      ) => {
        const span = sp.create(name, parent, attrs, options);
        if (keyArray.length) {
          const spanKey = makeSpanKey(keyArray);
          const record = { span, name, kind: keyArray[0], key: spanKey };
          keyToSpan.init(spanKey, record);
        }
        return span;
      },

      /**
       * @param {any[] | string} key
       * @param {Span} [parent]
       * @param {Record<string, any>} [attrs]
       * @param {SpanOptions} [options]
       */
      start: (
        key,
        parent = undefined,
        attrs = undefined,
        options = undefined,
      ) => {
        const keyArray = Array.isArray(key) ? key : [key];
        const [name] = keyArray;
        return sp.startNamed(name, keyArray, parent, attrs, options);
      },

      /**
       *
       * @param {string | string[]} key
       * @param {Record<string, any>} attrs
       * @param {string} [errorMessage]
       */
      end: (key, attrs = {}, errorMessage = undefined) => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = makeSpanKey(keyArray);
        const { span } = keyToSpan.get(spanKey);
        if (errorMessage) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
        }
        span.setAttributes(cleanAttrs(attrs));
        span.end(now);
        keyToSpan.delete(spanKey);
      },

      has: key => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = makeSpanKey(keyArray);
        return keyToSpan.has(spanKey);
      },

      get: key => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = makeSpanKey(keyArray);
        return keyToSpan.get(spanKey).span;
      },

      /**
       * @param {string | [string, ...any]} key
       * @param {object} [options]
       * @param {string} [options.kind]
       * @param {string} [options.name]
       * @param {Record<string, any>} [options.attributes]
       * @param {SpanLink[]} [options.links]
       */
      push: (
        key,
        {
          kind = undefined,
          name = undefined,
          attributes = currentAttrs,
          ...opts
        } = {},
      ) => {
        const keyArray = Array.isArray(key) ? key : [key];
        kind ??= keyArray[0];
        name ??= kind;
        const spanKey = makeSpanKey(keyArray);
        const span = sp.create(name, sp.top(), attributes, opts);
        const record = { span, name, kind, key: spanKey };
        keyToSpan.init(spanKey, record);
        spanStack.push(record);
        return span;
      },

      /**
       * @param {string | [string, ...any]} [assertKindOrKey]
       * @param {object} [options]
       * @param {Record<string, any>} [options.attributes]
       * @param {string} [options.errorMessage]
       */
      pop: (
        assertKindOrKey = undefined,
        { attributes = {}, errorMessage = undefined } = {},
      ) => {
        const top = spanStack[spanStack.length - 1];
        if (assertKindOrKey !== undefined) {
          assert(
            (typeof assertKindOrKey === 'string' &&
              top?.kind === assertKindOrKey) ||
              top?.key === makeSpanKey(assertKindOrKey),
          );
          lastAssertedKindPopTime = now;
        }
        if (top) {
          if (errorMessage !== undefined) {
            top.span.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMessage,
            });
          }
          top.span.setAttributes(cleanAttrs(attributes));
          top.span.end(lastAssertedKindPopTime);
          spanStack.pop();
          keyToSpan.delete(top.key);
        }
      },

      /** @returns {Span | undefined} */
      top: () => spanStack[spanStack.length - 1]?.span,
      /** @returns {string | undefined} */
      topKind: () => spanStack[spanStack.length - 1]?.kind,
    });
    return sp;
  };

  const spans = makeSpans();

  let finished = false;
  const finish = () => {
    finished = true;
    spans.endAll(now);
    let top = spans.top();
    while (top) {
      top.end(now);
      spans.pop();
      top = spans.top();
    }
  };

  const getCrankKey = create => {
    let key = ['crank', currentAttrs.crankNum];
    if (!create && !spans.has(key)) {
      const genericKey = ['crank', undefined];
      if (spans.has(genericKey)) {
        key = genericKey;
      }
    }
    return key;
  };

  const slogSender = obj => {
    const { time, monotime: _mt, type: slogType, ...slogAttrs } = obj;

    // Set up the context for this slog entry.
    nowFloat = time;
    now = floatSecondsToHiRes(nowFloat);
    currentAttrs = slogAttrs;

    if (finished) {
      return;
    }

    // console.log('slogging', obj);
    switch (slogType) {
      case 'kernel-init-start': {
        spans.push('init');
        break;
      }
      case 'kernel-init-finish': {
        spans.pop('init');
        break;
      }
      case 'bundle-kernel-start': {
        assert.equal(spans.topKind(), 'init');
        spans.push('bundle-kernel');
        break;
      }
      case 'bundle-kernel-finish': {
        spans.pop('bundle-kernel');
        break;
      }
      case 'import-kernel-start': {
        assert.equal(spans.topKind(), 'init');
        spans.push('import-kernel');
        break;
      }
      case 'import-kernel-finish': {
        spans.pop('import-kernel');
        break;
      }
      case 'create-vat': {
        const { vatSourceBundle: _2, name, ...attrs } = slogAttrs;
        spans.push(['create-vat', slogAttrs.vatID], {
          attributes: {
            'vat.name': name,
            ...attrs,
          },
        });
        vatIdToAttrs.init(slogAttrs.vatID, { name, ...attrs });
        break;
      }
      case 'vat-startup-start': {
        spans.push(['vat-startup', slogAttrs.vatID]);
        break;
      }
      case 'vat-startup-finish': {
        spans.pop(['vat-startup', slogAttrs.vatID]);
        spans.pop(['create-vat', slogAttrs.vatID]);
        break;
      }
      case 'start-replay': {
        assert(!isReplaying);
        spans.push(['vat-replay', slogAttrs.vatID]);
        isReplaying = true;
        break;
      }
      case 'finish-replay': {
        spans.pop(['vat-replay', slogAttrs.vatID]);
        assert(isReplaying);
        isReplaying = false;
        break;
      }
      case 'deliver': {
        const {
          vd: [delivery],
          kd,
          _replay,
          ...attrs
        } = slogAttrs;
        if (isReplaying) {
          spans
            .top()
            ?.addEvent(
              `deliver-${delivery}`,
              cleanAttrs({ delivery, ...attrs }),
              now,
            );
          break;
        }
        if (!kd) {
          break;
        }

        spans.get(getCrankKey()).setAttributes(
          cleanAttrs({
            delivery,
            vatName: vatIdToAttrs.get(attrs.vatID).name,
            ...attrs,
          }),
        );
        if (kd[0] === 'notify') {
          const [_type, notifications] = kd;
          const resolves = [];
          const rejects = [];
          for (const n of notifications) {
            const [kpid, { state }] = n;
            if (state === 'rejected') {
              rejects.push(kpid);
            } else {
              resolves.push(kpid);
            }
          }
          const detailses = [];
          if (resolves.length) {
            detailses.push(`resolve(${resolves.join(',')})`);
          }
          if (rejects.length) {
            detailses.push(`reject(${rejects.join(',')})`);
          }
          const details = `d-${attrs.vatID}: ${detailses.join(', ')}`;
          spans.get(getCrankKey()).setAttributes(cleanAttrs({ details }));

          // Track call graph.
          // TODO: We only track the first notified kernel promise. Perhaps we should do more?
          const [tKpid, { tState }] = notifications[0];
          const error = tState === 'rejected' ? 'rejected' : undefined;

          // TODO: figure out if this is correct?
          if (kernelPromiseToSendingCause.has(tKpid)) {
            // Track this notification as the cause for the current crank.
            const cause = JSON.parse(kernelPromiseToSendingCause.get(tKpid));
            // crankNum doesn't exist on replay
            crankNumToCause.init(slogAttrs.crankNum, {
              ...cause,
              attrs: { ...cause.attrs, state: tState },
              error,
            });
          }
        } else if (kd[0] === 'message') {
          const [
            _type,
            target,
            { methargs, method = extractMethod(methargs), result },
          ] = kd;
          const details = `d-${attrs.vatID}: E(${target}).${method}`;
          const msgAttrs = {
            'msg.target': target,
            'msg.method': extractMethod(methargs),
            'msg.slots': methargs.slots.join(','),
            'msg.result': result,
            details,
          };
          spans
            .get(getCrankKey())
            .setAttributes(cleanAttrs({ ...attrs, ...msgAttrs }));
          // This is where the message is delivered.
          // Track call graph.
          let cause;
          if (kernelPromiseToSendingCause.has(result)) {
            cause = JSON.parse(kernelPromiseToSendingCause.get(result));
          } else {
            // Create a new root span.
            const crankSpan = spans.get(getCrankKey());
            cause = {
              name: `deliver-${kd[0]}`,
              context: crankSpan.spanContext(),
              attrs: {
                ...attrs,
                ...msgAttrs,
              },
            };
          }
          crankNumToCause.init(slogAttrs.crankNum, cause);
        }
        break;
      }
      case 'deliver-result': {
        if (isReplaying) {
          break;
        }
        const {
          dr: [status, _1, rawMeterResult],
        } = slogAttrs;
        // remove timestamps for now
        const { timestamps: _t, ...meterResult } = rawMeterResult ?? {};
        spans.get(getCrankKey()).setAttributes(
          cleanAttrs({
            status,
            ...meterResult,
          }),
        );
        break;
      }
      case 'syscall': {
        if (isReplaying) {
          break;
        }
        const { ksc, vsc: _1, ...attrs } = slogAttrs;
        if (!ksc) {
          break;
        }

        const crankSpan = spans.get(getCrankKey());
        /**
         * @param {string} name
         * @param {Record<string, any>} [additionalAttributes]
         * @param {SpanOptions} [options ]
         */
        const makeSyscallSpan = (
          name,
          additionalAttributes = {},
          options = {},
        ) =>
          spans.startNamed(
            name,
            [`syscall`, slogAttrs.crankNum],
            crankSpan,
            {
              syscall: ksc[0],
              ...attrs,
              ...additionalAttributes,
            },
            options,
          );
        const syscallType = ksc[0];
        const name = `syscall-${syscallType}`;
        // TODO: get type from packages/SwingSet/src/kernel/kernelSyscall.js
        const detailPrefix = `s-${attrs.vatID}`;
        switch (syscallType) {
          case 'send': {
            const [
              _tag,
              target,
              { methargs, method = extractMethod(methargs), result },
            ] = ksc;
            const details = `${detailPrefix}: E(${target}).${method}`;
            const sattrs = {
              'msg.target': target,
              'msg.method': method,
              'msg.slots': methargs.slots.join(','),
              'msg.result': result,
              details,
            };
            const links = [];
            if (crankNumToCause.has(attrs.crankNum)) {
              const parentCause = crankNumToCause.get(attrs.crankNum);
              links.push({
                attributes: { syscall: syscallType },
                context: parentCause.context,
              });
            }
            const syscall = makeSyscallSpan(name, sattrs, { links });
            if (result) {
              // Track call graph.
              const cause = { name: details, context: syscall.spanContext() };
              kernelPromiseToSendingCause.set(result, JSON.stringify(cause));
            }
            break;
          }
          case 'invoke': {
            const [_, target, method, args] = ksc;
            const sattrs = {
              'call.target': target,
              'call.method': method,
              'call.slots': args.slots.join(','),
              details: `${detailPrefix}: D(${target}).${method}`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'resolve': {
            const [_, vatID, resolutions] = ksc;
            const resolves = [];
            const rejects = [];
            for (const r of resolutions) {
              const [kpid, rejected] = r;
              if (rejected) {
                rejects.push(kpid);
              } else {
                resolves.push(kpid);
              }
            }
            const detailses = [];
            if (resolves.length) {
              detailses.push(`resolve(${resolves.join(',')})`);
            }
            if (rejects.length) {
              detailses.push(`reject(${rejects.join(',')})`);
            }
            const sattrs = {
              vatID,
              details: `${detailPrefix}: ${detailses.join(', ')}`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'subscribe': {
            const [_, vatID, kpid] = ksc;
            const sattrs = {
              vatID,
              kpid,
              details: `${detailPrefix}: subscribe(${kpid})`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'vatstoreGet': {
            const [_, vatID, key] = ksc;
            const sattrs = {
              vatID,
              key,
              details: `${detailPrefix}: vatstoreGet('${key}')`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'vatstoreGetAfter': {
            const [_, vatID, priorKey, lowerBound, upperBound = ''] = ksc;
            const sattrs = {
              vatID,
              priorKey,
              lowerBound,
              upperBound,
              details: `${detailPrefix}: vatstoreGetAfter('${priorKey}', '${lowerBound}', '${upperBound}')`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'vatstoreSet': {
            const [_, vatID, key, value] = ksc;
            const sattrs = {
              vatID,
              key,
              value,
              details: `${detailPrefix}: vatstoreSet('${key}', '${value}')`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'vatstoreDelete': {
            const [_, vatID, key] = ksc;
            const sattrs = {
              vatID,
              key,
              details: `${detailPrefix}: vatstoreDelete('${key}')`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'dropImports':
          case 'retireImports':
          case 'retireExports': {
            const [_, krefs] = ksc;
            const krefList = krefs.join(',');
            const sattrs = {
              krefs: krefList,
              details: `${detailPrefix}: ${syscallType}(${krefList})`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          case 'exit': {
            const [_, vatID, failure] = ksc;
            const sattrs = {
              vatID,
              failure,
              details: `${detailPrefix}: exit(${failure})`,
            };
            makeSyscallSpan(name, sattrs);
            break;
          }
          default: {
            console.error(`Unknown syscall type:`, syscallType);
          }
        }
        break;
      }
      case 'syscall-result': {
        const {
          ksr: _1,
          vsr: [status],
          ...attrs
        } = slogAttrs;
        const key = ['syscall', slogAttrs.crankNum];
        if (spans.has(key)) {
          spans.end(key, { status, ...attrs }, status !== 'ok' && status);
        }
        break;
      }
      case 'kernel-stats': {
        spans.top()?.addEvent('kernel-stats', cleanAttrs(slogAttrs.stats), now);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-start': {
        dbTransactionManager.begin();
        assert(!spans.top());
        spans.push(['block', 0]);
        spans.push(['end-block', 0]);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-finish': {
        spans.pop(['end-block', 0]);
        spans.pop(['block', 0]);
        dbTransactionManager.end();
        break;
      }
      case 'cosmic-swingset-begin-block': {
        dbTransactionManager.begin();
        if (spans.topKind() === 'intra-block') {
          spans.pop('intra-block');
          spans.pop('block');
        }
        assert(!spans.top());

        // TODO: Move the encompassing `block` root span to cosmos
        spans.push(['block', slogAttrs.blockHeight]);
        spans.top()?.addEvent(`begin-block-action`, cleanAttrs(slogAttrs), now);
        break;
      }
      case 'cosmic-swingset-commit-block-start': {
        spans.push(['commit-block', slogAttrs.blockHeight]);
        break;
      }
      case 'cosmic-swingset-commit-block-finish': {
        spans.pop(['commit-block', slogAttrs.blockHeight]);
        // Push a span to capture the time between blocks from cosmic-swingset POV
        spans.push(['intra-block', slogAttrs.blockHeight]);
        break;
      }
      case 'cosmic-swingset-after-commit-block': {
        // Add the event to whatever the current top span is (most likely intra-block)
        spans.top()?.addEvent('after-commit', cleanAttrs(slogAttrs), now);
        dbTransactionManager.end();
        break;
      }
      case 'cosmic-swingset-deliver-inbound': {
        spans.push(['deliver-inbound', slogAttrs.sender]);
        spans.pop('deliver-inbound');
        break;
      }
      case 'cosmic-swingset-bridge-inbound': {
        spans.push(['bridge-inbound', slogAttrs.source]);
        spans.pop('bridge-inbound');
        break;
      }
      case 'cosmic-swingset-end-block-start': {
        // Add `end-block` as an event onto the encompassing `block` span
        spans.top()?.addEvent('end-block-action', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        // Don't record finish
        break;
      }
      case 'cosmic-swingset-run-start': {
        spans.push(`swingset-run`);
        break;
      }
      case 'cosmic-swingset-run-finish': {
        spans.pop(`swingset-run`);
        break;
      }
      case 'heap-snapshot-save': {
        // Add an event to whatever the top span is for now (likely crank)
        spans.top()?.addEvent('snapshot-save', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'heap-snapshot-load': {
        // Ignore
        break;
      }
      case 'crank-start': {
        const { message, crankType, ...crankAttrs } = slogAttrs;
        if (crankType === 'routing') {
          break;
        }
        const [name, _messageAttrs, links] = extractMessageAttrs(message);
        spans.startNamed(
          `deliver-${name}`,
          getCrankKey(true),
          spans.top(),
          { ...crankAttrs },
          { links },
        );
        break;
      }
      case 'clist': {
        spans.get(getCrankKey()).addEvent('clist', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'crank-finish': {
        if (!spans.has(getCrankKey())) {
          // skip routing crank
          break;
        }
        let attrs;
        let error;
        if (crankNumToCause.has(slogAttrs.crankNum)) {
          const cause = crankNumToCause.get(slogAttrs.crankNum);
          ({ attrs, error } = cause);
          crankNumToCause.delete(slogAttrs.crankNum);
        }
        spans.end(getCrankKey(), attrs, error);
        break;
      }
      case 'console': {
        // We don't care about console messages.  They are out of consensus and
        // can be really huge.
        // spans.top()?.addEvent('console', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'terminate': {
        spans.top()?.addEvent('terminate', cleanAttrs(slogAttrs), now);
        break;
      }
      default: {
        console.error(`Unknown slog type: ${slogType}`);
      }
    }
  };

  const wrappedSlogSender = obj => {
    try {
      slogSender(obj);
    } catch (e) {
      console.error(`Error tracing slog:`, obj, e);
      throw e;
    }
  };

  return { slogSender: wrappedSlogSender, finish };
};
