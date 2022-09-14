// @ts-check
import otel, { SpanStatusCode } from '@opentelemetry/api';

import { makeLegacyMap } from '@agoric/store';
import { makeKVStringStore } from './kv-string-store.js';

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);

/** @typedef {import('@opentelemetry/api').Span} Span */
/** @typedef {import('@opentelemetry/api').Link} SpanLink */
/** @typedef {import('@opentelemetry/api').SpanContext} SpanContext */
/** @typedef {import('@opentelemetry/api').SpanOptions} SpanOptions */

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

  /** @type {Span | undefined} */
  let activeDeliverySpan;

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

  const kernelPromiseToSendingCause = makeKVStringStore('kernelPromise');

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
        // TODO: The arguments to a method call can be pretty big.
        delete attrs.msg;
        const { methargs, method = extractMethod(methargs) } = message.msg;
        name = `E(${message.target}).${method}`;
        const slots =
          message.msg.methargs?.slots ?? message.msg.args.slots ?? [];
        attrs['message.msg.args.slots'] = slots.join(',');
        attrs['message.msg.method'] = name;
        attrs['message.msg.result'] = message.msg.result;
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
        // start-replay can happen at init or during a crank
        const parentKind = spans.topKind();
        assert(parentKind === 'init' || parentKind === 'crank');
        assert(!isReplaying);
        spans.push(['vat-replay', slogAttrs.vatID]);
        isReplaying = true;
        break;
      }
      case 'finish-replay': {
        spans.pop(['vat-replay', slogAttrs.vatID]);
        assert(isReplaying);
        isReplaying = false;
        // finish-replay can happen at init or during a crank
        const parentKind = spans.topKind();
        assert(parentKind === 'init' || parentKind === 'crank');
        break;
      }
      case 'deliver': {
        const {
          vd: [delivery],
          kd,
          ...attrs
        } = slogAttrs;
        if (!kd) {
          break;
        }
        if (!activeDeliverySpan) {
          assert(isReplaying);
          // Create a span to hold the related syscalls
          activeDeliverySpan = spans.push(
            ['deliver', attrs.vatID, attrs.deliveryNum],
            { attributes: {} },
          );
        }
        activeDeliverySpan.setAttributes(cleanAttrs({ delivery, ...attrs }));
        if (kd[0] === 'notify') {
          // Track call graph.
          const [_type, [notification]] = kd;
          // TODO: We only track the first notified kernel promise. Perhaps we should do more?
          const [kpId, { state }] = notification;
          const error = state === 'rejected' ? 'rejected' : undefined;
          // TODO: figure out if this is correct?
          if (!isReplaying && kernelPromiseToSendingCause.has(kpId)) {
            // Track this notification as the cause for the current crank.
            const cause = JSON.parse(kernelPromiseToSendingCause.get(kpId));
            // crankNum doesn't exist on replay
            crankNumToCause.init(slogAttrs.crankNum, {
              ...cause,
              attrs: { ...cause.attrs, state },
              error,
            });
          }
        } else if (kd[0] === 'message') {
          // This is where the message is delivered.
          // Track call graph.
          const [
            _type,
            target,
            { methargs, method = extractMethod(methargs), result },
          ] = kd;
          let cause;
          if (kernelPromiseToSendingCause.has(result)) {
            cause = JSON.parse(kernelPromiseToSendingCause.get(result));
          } else {
            // Create a new root span.
            const name = `E(${target}).${method}`;
            cause = {
              name,
              context: crankSpan.spanContext(),
              attrs: {
                target,
                method,
                result,
                ...attrs,
              },
            };
          }
          crankNumToCause.init(slogAttrs.crankNum, cause);
        }
        break;
      }
      case 'deliver-result': {
        const {
          dr: [status, _1, rawMeterResult],
          // ...attrs
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
        // TODO: get type from packages/SwingSet/src/kernel/kernelSyscall.js
        switch (ksc[0]) {
          case 'send': {
            const [
              _tag,
              target,
              { methargs, method = extractMethod(methargs), result },
            ] = ksc;
            const name = `E(${target}).${method}`;
            const links = [];
            if (crankNumToCause.has(attrs.crankNum)) {
              const parentCause = crankNumToCause.get(attrs.crankNum);
              links.push({
                attributes: { syscall: ksc[0] },
                context: parentCause.context,
              });
            }
            const syscall = makeSyscallSpan(
              name,
              {
                target,
                method,
                result,
              },
              { links },
            );
            if (result) {
              // Track call graph.
              const cause = { name, context: syscall.spanContext() };
              kernelPromiseToSendingCause.set(result, JSON.stringify(cause));
            }
            break;
          }
          case 'invoke': {
            const [_, target, method] = ksc;
            makeSyscallSpan(`D(${target}).${method}`, { target, method });
            break;
          }
          case 'resolve':
          case 'subscribe':
          case 'vatstoreGet':
          case 'vatstoreGetAfter':
          case 'vatstoreSet':
          case 'vatstoreDelete':
          case 'dropImports':
          case 'retireImports':
          case 'retireExports':
          case 'exit': {
            // TODO: Maybe too noisy and mostly irrelevant?
            // makeSyscallSpan(ksc[0]);
            break;
          }
          default: {
            console.error(`Unknown syscall type:`, ksc[0]);
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
      case 'cosmic-swingset-bootstrap-block-start': {
        assert(!spans.top());
        spans.push(['block', 0]);
        spans.push(['end-block', 0]);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-finish': {
        spans.pop(['end-block', 0]);
        spans.pop(['block', 0]);
        break;
      }
      case 'cosmic-swingset-begin-block': {
        if (spans.topKind() === 'intra-block') {
          spans.pop('intra-block');
          spans.pop('block');
        }
        assert(!spans.top());

        // TODO: Move the encompassing `block` root span to cosmos
        spans.push(['block', slogAttrs.blockHeight]);
        spans.push(['begin-block', slogAttrs.blockHeight]);
        spans.pop('begin-block');
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
        break;
      }
      case 'cosmic-swingset-deliver-inbound': {
        spans.push(['deliver-inbound', slogAttrs.sender]);
        spans.pop(`deliver-inbound`);
        break;
      }
      case 'cosmic-swingset-bridge-inbound': {
        spans.push(['bridge-inbound', slogAttrs.source]);
        spans.pop(`bridge-inbound`);
        break;
      }
      case 'cosmic-swingset-end-block-start': {
        spans.push(['end-block', slogAttrs.blockHeight]);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        spans.pop(['end-block', slogAttrs.blockHeight]);
        break;
      }
      case 'crank-start': {
        const { message, ...crankAttrs } = slogAttrs;
        const [name, messageAttrs, links] = extractMessageAttrs(message);
        spans.startNamed(
          name,
          getCrankKey(true),
          spans.top(),
          { ...crankAttrs, ...messageAttrs },
          {
            links,
          },
        );
        break;
      }
      case 'clist': {
        spans.get(getCrankKey()).addEvent('clist', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'crank-finish': {
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
