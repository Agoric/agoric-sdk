// @ts-check
import otel, { SpanStatusCode } from '@opentelemetry/api';

import { makeLegacyMap } from '@agoric/store';

export { getTelemetryProviders } from '@agoric/telemetry';

// import {  diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

/** @typedef {import('@opentelemetry/api').Span} Span */

const cleanValue = value => {
  switch (typeof value) {
    case 'bigint': {
      // Use Protobuf JSON convention: replace bigint with string.
      // return `${val}`;
      // Use rounding convention: replace bigint with number.
      return Number(value);
    }
    case 'object': {
      if (value === null) {
        return undefined;
      }
      if (Array.isArray(value)) {
        return JSON.stringify(
          value.map(cleanValue).filter(v => v !== undefined),
        );
      }
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, cleanValue(v)]),
        ),
      );
    }
    default: {
      return value;
    }
  }
};

export const cleanAttrs = attrs =>
  Object.fromEntries(
    Object.entries(attrs)
      .map(([key, value]) => [key, cleanValue(value)])
      .filter(([_key, value]) => value !== undefined),
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
       * @param {Span} parent
       * @param {Record<string, any>} [attrs]
       */
      startNamed: (name, keyArray, parent, attrs = currentAttrs) => {
        const ctx = parent && otel.trace.setSpan(otel.context.active(), parent);
        const spanKey = JSON.stringify(keyArray);
        const span = tracer.startSpan(
          name,
          { startTime: now },
          ctx,
        ).setAttributes(cleanAttrs(attrs));
        keyToSpan.init(spanKey, span);
        return span;
      },

      /**
       * @param {any[] | string} key
       * @param {Span} parent
       * @param {Record<string, any>} [attrs]
       */
      start: (key, parent, attrs = undefined) => {
        const keyArray = Array.isArray(key) ? key : [key];
        const [name] = keyArray;
        return sp.startNamed(name, keyArray, parent, attrs);
      },

      end: (key, attrs = currentAttrs, errorMessage = undefined) => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = JSON.stringify(keyArray);
        const span = keyToSpan.get(spanKey);
        if (errorMessage !== undefined) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
        }
        span.setAttributes(cleanAttrs(attrs)).end(now);
        keyToSpan.delete(spanKey);
      },

      has: key => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = JSON.stringify(keyArray);
        return keyToSpan.has(spanKey);
      },

      get: key => {
        const keyArray = Array.isArray(key) ? key : [key];
        const spanKey = JSON.stringify(keyArray);
        return keyToSpan.get(spanKey);
      },
    });
    return sp;
  };

  const spans = makeSpans();
  let currentPhase = 'init';

  /** @type {Span} */
  let topSpan;

  let sendOnlyCounter = 0;

  let finished = false;
  const finish = () => {
    finished = true;
    spans.endAll(now);
    if (topSpan) {
      topSpan.end(now);
    }
  };

  const slogSender = obj => {
    const { time: nowFloat, type: slogType, ...slogAttrs } = obj;

    // Set up the context for this slog entry.
    now = floatSecondsToHiRes(nowFloat);
    currentAttrs = slogAttrs;

    if (!topSpan) {
      // Initialize the top-level span with the first timestamped slog entry.
      topSpan = tracer.startSpan('main', { startTime: now });
    }

    if (finished) {
      return;
    }

    // console.log('slogging', obj);
    switch (slogType) {
      case 'import-kernel-start': {
        spans.start('import-kernel', topSpan);
        break;
      }
      case 'import-kernel-finish': {
        spans.end('import-kernel');
        break;
      }
      case 'create-vat': {
        const { vatSourceBundle: _2, ...attrs } = slogAttrs;
        spans.start(['vat', slogAttrs.vatID], topSpan, attrs);
        break;
      }
      case 'vat-startup-start': {
        spans.start(
          ['vat-startup', slogAttrs.vatID],
          spans.get(['vat', slogAttrs.vatID]),
        );
        break;
      }
      case 'vat-startup-finish': {
        spans.end(['vat-startup', slogAttrs.vatID]);
        break;
      }
      case 'start-replay': {
        spans.start(
          ['vat-replay', slogAttrs.vatID],
          spans.get(['vat', slogAttrs.vatID]),
        );
        break;
      }
      case 'finish-replay': {
        spans.end(['vat-replay', slogAttrs.vatID]);
        break;
      }
      case 'deliver': {
        // FIXME: Process the deliveries.
        const {
          vd: [delivery],
          kd: _2,
          ...attrs
        } = slogAttrs;
        spans.start(
          ['deliver', slogAttrs.vatID],
          spans.get(['vat', slogAttrs.vatID]),
          { delivery, ...attrs },
        );
        break;
      }
      case 'deliver-result': {
        const {
          dr: [status, _1, meterResult],
          ...attrs
        } = slogAttrs;
        spans.end(['deliver', slogAttrs.vatID], {
          status,
          ...meterResult,
          ...attrs,
        });
        break;
      }
      case 'syscall': {
        const {
          ksc,
          vsc: [syscall],
          ...attrs
        } = slogAttrs;
        const deliverSpan = spans.get(['deliver', slogAttrs.vatID]);
        const syscallSpan = spans.start(
          ['syscall', slogAttrs.vatID],
          deliverSpan,
          cleanAttrs({ syscall, ...attrs }),
        );
        if (ksc) {
          // TODO: get type from packages/SwingSet/src/kernel/kernelSyscall.js
          switch (ksc[0]) {
            case 'send': {
              const [_tag, target, { method, result }] = ksc;
              syscallSpan.setAttributes(cleanAttrs({ target, method, result }));
              if (result) {
                syscallSpan.updateName(`E(${target}).${method}`);
                spans.start(
                  ['promise', result],
                  syscallSpan,
                  {
                    ...attrs,
                    target,
                    method,
                    result,
                  },
                );
              } else {
                syscallSpan.updateName(`E.sendOnly(${target}).${method}`);
              }
              break;
            }
            case 'invoke': {
              const [_, target, method] = ksc;
              syscallSpan.updateName(`D(${target}).${method}`);
              break;
            }
            case 'resolve': {
              const [_, _thatVat, parts] = ksc;
              for (const [kp, rejected, _args] of parts) {
                const key = ['promise', kp];
                // We don't (yet) track every promise, so make this conditional.
                if (spans.has(key)) {
                  spans.end(key, attrs, rejected && 'rejected');
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
              syscallSpan.updateName(syscall);
              break;
            }
            default: {
              console.error(`Unknown syscall type:`, ksc[0]);
            }
          }
        } else {
          spans.end(['syscall', slogAttrs.vatID], {});
        }
        break;
      }
      case 'syscall-result': {
        const {
          ksr: _1,
          vsr: [status],
          ...attrs
        } = slogAttrs;
        spans.end(['syscall', slogAttrs.vatID], { status, ...attrs }, status !== 'ok' && status);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-start': {
        currentPhase = 'bootstrap-block';
        spans.start(`bootstrap-block`, topSpan);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-finish': {
        spans.end(`bootstrap-block`);
        currentPhase = 'idle';
        break;
      }
      case 'cosmic-swingset-begin-block': {
        currentPhase = 'begin-block';
        spans.start(`begin-block`, topSpan);
        spans.end(`begin-block`);
        currentPhase = 'block';
        spans.start(`block`, topSpan);
        break;
      }
      case 'cosmic-swingset-deliver-inbound': {
        spans
          .get(currentPhase)
          .addEvent('deliver-inbound', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'cosmic-swingset-bridge-inbound': {
        spans
          .get(currentPhase)
          .addEvent('bridge-inbonud', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'cosmic-swingset-end-block-start': {
        spans.end(`block`);
        currentPhase = 'end-block';
        spans.start(currentPhase, topSpan);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        spans.end(`end-block`);
        currentPhase = 'idle';
        break;
      }
      case 'crank-start': {
        const crankAttrs = shortenMessageAttrs(slogAttrs.message);
        spans.start(`crank`, spans.get(currentPhase), crankAttrs);
        break;
      }
      case 'clist': {
        spans.get(`crank`).addEvent('clist', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'crank-finish': {
        spans.end(`crank`);
        break;
      }
      case 'console': {
        // We don't care about console messages.  They can occur during startup.
        // spans.get(`crank`).addEvent('console', cleanAttrs(slogAttrs), now);
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
    }
  };

  return { slogSender: wrappedSlogSender, finish };
};
