// @ts-check
import otel, { SpanStatusCode } from '@opentelemetry/api';

import { makeLegacyMap } from '@agoric/store';

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

export { getTelemetryProviders } from '@agoric/telemetry';

/** @typedef {import('@opentelemetry/api').Span} Span */
/** @typedef {import('@opentelemetry/api').SpanOptions} SpanOptions */

const cleanValue = (value, _key) => {
  let subst = value;
  switch (typeof value) {
    case 'bigint': {
      // Use Protobuf JSON convention: replace bigint with string.
      // return `${val}`;
      // Use rounding convention: replace bigint with number.
      subst = Number(value);
      break;
    }
    case 'object': {
      if (value === null) {
        subst = undefined;
      } else if (Array.isArray(value)) {
        subst = JSON.stringify(
          value.map(cleanValue).filter(v => v !== undefined),
        );
      } else {
        subst = JSON.stringify(
          Object.fromEntries(
            Object.entries(value)
              .map(([k, v]) => [k, cleanValue(v, k)])
              .filter(([_k, v]) => v !== undefined && v !== null),
          ),
        );
      }
      break;
    }
    default:
  }
  return subst;
};

export const cleanAttrs = attrs =>
  Object.fromEntries(
    Object.entries(attrs)
      .map(([key, value]) => [key, cleanValue(value, key)])
      .filter(([_key, value]) => value !== undefined && value !== null),
  );

/**
 * @param {number} sFloat
 * @returns {[number, number]}
 */
export const floatSecondsToHiRes = sFloat => {
  const sInt = Math.trunc(sFloat);
  const ns = Number((sFloat - sInt).toFixed(9)) * 1e9;
  return [sInt, ns];
};

const shortenMessageAttrs = ({ type: messageType, ...message }) => {
  /** @type {Record<string, any>} */
  const attrs = { 'message.type': messageType, ...message };
  switch (messageType) {
    case 'create-vat': {
      if (attrs.source.bundle) {
        attrs.source = { ...attrs.source, bundle: '*elided*' };
      }
      break;
    }
    case 'send': {
      // TODO: The arguments to a method call can be pretty big.
      delete attrs.msg;
      attrs['message.msg.method'] = message.msg.method;
      attrs['message.msg.args.slots'] = message.msg.args.slots;
      attrs['message.msg.result'] = message.msg.result;
      break;
    }
    case 'dropExports':
    case 'retireExports':
    case 'retireImports':
    case 'notify':
    case 'bringOutYourDead': {
      // Use all the attrs.
      break;
    }
    default: {
      console.error(`Unknown crank-start message.type`, messageType);
    }
  }
  return attrs;
};

/** @param {import('@opentelemetry/api').Tracer} tracer */
export const makeSlogSenderKit = tracer => {
  let now;
  /** @type {Record<string, any>} */
  let currentAttrs = {};

  const makeSpans = () => {
    /** @type {LegacyMap<string, Span>} */
    // Legacy because spans are not passable
    const keyToSpan = makeLegacyMap('spanKey');

    /** @type {{ span: Span, name: string }[]} */
    const spanStack = [];

    const makeSpanKey = keyArray => JSON.stringify(cleanAttrs(keyArray));

    const sp = harden({
      endAll: endTime => {
        for (const [_keyName, span] of keyToSpan.entries()) {
          span.end(endTime);
        }
        keyToSpan.clear();
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
        const ctx = parent && otel.trace.setSpan(otel.context.active(), parent);
        const span = tracer.startSpan(
          name,
          { startTime: now, attributes: cleanAttrs(attrs), ...options },
          ctx,
        );
        if (keyArray.length) {
          const spanKey = makeSpanKey(keyArray);
          keyToSpan.init(spanKey, span);
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

      end: (key, attrs = {}, errorMessage = undefined) => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = makeSpanKey(keyArray);
        const span = keyToSpan.get(spanKey);
        if (errorMessage !== undefined) {
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
        return keyToSpan.get(spanKey);
      },

      push: (name, attrs = currentAttrs) => {
        const span = sp.startNamed(name, [], sp.top(), attrs);
        spanStack.push({ span, name });
      },

      pop: (assertName = undefined) => {
        const popped = spanStack.pop();
        if (assertName !== undefined) {
          assert.equal(popped?.name, assertName);
        }
        popped?.span.end(now);
      },

      top: () => spanStack[spanStack.length - 1]?.span,
    });
    return sp;
  };

  const spans = makeSpans();
  /** @type {LegacyMap<string, Span>} */
  const kernelPromiseToSpan = makeLegacyMap('kernelPromise');

  let finished = false;
  const finish = () => {
    finished = true;
    spans.endAll(now);
    const top = spans.top();
    while (top) {
      top.end(now);
      spans.pop();
    }
  };

  let initing = true;

  const getCrankKey = () => {
    let key = ['crank', currentAttrs.crankNum];
    if (!spans.has(key)) {
      const genericKey = ['crank', undefined];
      if (spans.has(genericKey)) {
        key = genericKey;
      }
    }
    return key;
  };

  const slogSender = obj => {
    const { time: nowFloat, type: slogType, ...slogAttrs } = obj;

    // Set up the context for this slog entry.
    now = floatSecondsToHiRes(nowFloat);
    currentAttrs = slogAttrs;

    if (initing) {
      // Initialize the top-level span with the first timestamped slog entry.
      spans.push('init');
      initing = false;
    }

    if (finished) {
      return;
    }

    // console.log('slogging', obj);
    switch (slogType) {
      case 'import-kernel-start': {
        spans.start('import-kernel', spans.top());
        break;
      }
      case 'import-kernel-finish': {
        spans.end('import-kernel');
        spans.pop('init');
        break;
      }
      case 'create-vat': {
        const { vatSourceBundle: _2, name, ...attrs } = slogAttrs;
        spans.start(['create-vat', slogAttrs.vatID], spans.top(), {
          'vat.name': name,
          ...attrs,
        });
        spans.end(['create-vat', slogAttrs.vatID]);
        break;
      }
      case 'vat-startup-start': {
        spans.start(['vat-startup', slogAttrs.vatID], spans.top());
        break;
      }
      case 'vat-startup-finish': {
        spans.end(['vat-startup', slogAttrs.vatID]);
        break;
      }
      case 'start-replay': {
        spans.start(['vat-replay', slogAttrs.vatID], spans.top());
        break;
      }
      case 'finish-replay': {
        spans.end(['vat-replay', slogAttrs.vatID]);
        break;
      }
      case 'deliver': {
        const {
          vd: [delivery],
          kd: _2,
          ...attrs
        } = slogAttrs;
        spans
          .get(getCrankKey())
          .setAttributes(cleanAttrs({ delivery, ...attrs }));
        /*
        spans.startNamed(delivery, ['deliver', slogAttrs.vatID], spans.top(), {
          delivery,
          ...attrs,
        });
        */
        break;
      }
      case 'deliver-result': {
        const {
          dr: [status, _1, meterResult],
          // ...attrs
        } = slogAttrs;
        spans.get(getCrankKey()).setAttributes(
          cleanAttrs({
            status,
            ...meterResult,
          }),
        );
        /*
        spans.end(['deliver', slogAttrs.vatID], {
          status,
          ...meterResult,
          ...attrs,
        });
        */
        break;
      }
      case 'syscall': {
        const { ksc, vsc: _1, ...attrs } = slogAttrs;
        if (!ksc) {
          break;
        }

        const crankSpan = spans.get(getCrankKey());
        const makeSyscallSpan = (name, att = {}, options = {}) =>
          spans.startNamed(
            name,
            [`syscall`, slogAttrs.crankNum],
            crankSpan,
            { syscall: ksc[0], ...attrs, ...att },
            options,
          );
        // TODO: get type from packages/SwingSet/src/kernel/kernelSyscall.js
        switch (ksc[0]) {
          case 'send': {
            const [_tag, target, { method, result }] = ksc;
            const syscall = makeSyscallSpan(method, { target, method, result });
            if (result) {
              kernelPromiseToSpan.init(result, syscall);
            }
            break;
          }
          case 'invoke': {
            const [_, target, method] = ksc;
            makeSyscallSpan(method, { target, method });
            break;
          }
          case 'resolve': {
            const [_, _thatVat, parts] = ksc;
            const links = [];
            for (const [kp, _rejected, _args] of parts) {
              // We don't (yet) track every promise, so make this conditional.
              if (kernelPromiseToSpan.has(kp)) {
                const linkedSpan = kernelPromiseToSpan.get(kp);
                links.push({ context: linkedSpan.spanContext() });
              }
            }
            const syscall = makeSyscallSpan('resolve', {}, { links });

            for (const [kp, rejected, _args] of parts) {
              // Add events for each promise that was resolved.
              if (kernelPromiseToSpan.has(kp)) {
                syscall.addEvent(kp, cleanAttrs({ rejected }), now);
                kernelPromiseToSpan.delete(kp);
              }
            }

            break;
          }
          case 'subscribe':
          case 'vatstoreGet':
          case 'vatstoreSet':
          case 'vatstoreDelete':
          case 'dropImports':
          case 'retireImports':
          case 'retireExports': {
            makeSyscallSpan(ksc[0]);
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
        spans.end(
          ['syscall', slogAttrs.crankNum],
          { status, ...attrs },
          status !== 'ok' && status,
        );
        break;
      }
      case 'cosmic-swingset-bootstrap-block-start': {
        spans.start(`bootstrap-block`, spans.top());
        break;
      }
      case 'cosmic-swingset-bootstrap-block-finish': {
        spans.end(`bootstrap-block`);
        while (spans.top()) {
          // Pop off all our context.
          spans.pop();
        }
        break;
      }
      case 'cosmic-swingset-begin-block': {
        while (spans.top()) {
          // Reset the stack, if we didn't get all the events.
          spans.pop();
        }
        spans.push(`block`);
        spans.start(`begin-block`, spans.top());
        spans.end(`begin-block`);
        break;
      }
      case 'cosmic-swingset-deliver-inbound': {
        spans.start('deliver-inbound', spans.top());
        spans.end(`deliver-inbound`);
        break;
      }
      case 'cosmic-swingset-bridge-inbound': {
        spans.start('bridge-inbound', spans.top());
        spans.end(`bridge-inbound`);
        break;
      }
      case 'cosmic-swingset-end-block-start': {
        spans.push(`end-block`);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        spans.pop('end-block');
        break;
      }
      case 'cosmic-swingset-save-chain-start': {
        spans.push(`save-chain`);
        break;
      }
      case 'cosmic-swingset-save-chain-finish': {
        spans.pop('save-chain');
        break;
      }
      case 'cosmic-swingset-save-external-start': {
        spans.push(`save-external`);
        break;
      }
      case 'cosmic-swingset-save-external-finish': {
        spans.pop('save-external');
        spans.pop('block');
        break;
      }
      case 'crank-start': {
        const crankAttrs = shortenMessageAttrs(slogAttrs.message);
        spans.startNamed(
          crankAttrs['message.msg.method'] || crankAttrs['message.type'],
          getCrankKey(),
          spans.top(),
          crankAttrs,
        );
        break;
      }
      case 'clist': {
        spans.get(getCrankKey()).addEvent('clist', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'crank-finish': {
        spans.end(getCrankKey());
        break;
      }
      case 'console': {
        // We don't care about console messages.  They are out of consensus.
        // spans.top()?.addEvent('console', cleanAttrs(slogAttrs), now);
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
