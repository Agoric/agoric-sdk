// @ts-check
import otel from '@opentelemetry/api';

import { makeLegacyMap } from '@agoric/store';

export { getTelemetryProviders } from '@agoric/telemetry';

/** @typedef {import('@opentelemetry/api').Span} Span */

const cleanValue = value => {
  switch (typeof value) {
    case 'bigint':
    case 'object': {
      return JSON.stringify(value, (_key, val) => {
        if (typeof val === 'bigint') {
          // Use Protobuf JSON convention: replace bigint with string.
          // return `${val}`;
          // Use rounding convention: replace bigint with number.
          return Number(val);
        }
        return val;
      });
    }
    default: {
      return value;
    }
  }
};

const cleanAttrs = attrs =>
  Object.fromEntries(
    Object.entries(attrs)
      .filter(([_key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, cleanValue(value)]),
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
  let now = undefined;
  /** @type {Record<string, any>} */
  let currentAttrs = {};

  /** @type {Span} */
  let topSpan;

  /** @type {LegacyMap<string, Span>} */
  // Legacy because spans are not passable
  const spans = makeLegacyMap('spanKey');

  const finish = () => {
    finished = true;
    for (const [keyName, span] of spans.entries()) {
      span.end(now);
    }
    spans.clear();
    topSpan.end(now);
  };

  const startSpan = (dotKey, parent, attrs = currentAttrs) => {
    const dotIdx = dotKey.indexOf('.');
    const name = dotKey.slice(0, dotIdx >= 0 ? dotIdx : dotKey.length);
    const ctx = parent && otel.trace.setSpan(otel.context.active(), parent);
    const span = tracer.startSpan(
      name,
      { startTime: now, attributes: cleanAttrs(attrs) },
      ctx,
    );
    spans.init(dotKey, span);
    return span;
  };

  const endSpan = (dotKey, attrs = currentAttrs) => {
    spans
      .get(dotKey)
      .setAttributes(cleanAttrs(attrs))
      .end(now);
    spans.delete(dotKey);
  };

  let currentPhase = 'init';

  let finished = false;
  const slogSender = obj => {
    if (finished) {
      return;
    }
    const { time: nowFloat, type: slogType, ...slogAttrs } = obj;

    // Set up the context for this slog entry.
    now = floatSecondsToHiRes(nowFloat);
    currentAttrs = slogAttrs;

    if (!topSpan) {
      // Initialize the top-level span with the first timestamped slog entry.
      topSpan = tracer.startSpan('main', { startTime: now });
    }

    // console.log('slogging', obj);
    switch (slogType) {
      case 'import-kernel-start': {
        startSpan('import-kernel', topSpan);
        break;
      }
      case 'import-kernel-finish': {
        endSpan('import-kernel');
        break;
      }
      case 'create-vat': {
        const { vatSourceBundle: _2, ...attrs } = slogAttrs;
        startSpan(`vat.${slogAttrs.vatID}`, topSpan, attrs);
        break;
      }
      case 'vat-startup-start': {
        startSpan(
          `vat-startup.${slogAttrs.vatID}`,
          spans.get(`vat.${slogAttrs.vatID}`),
        );
        break;
      }
      case 'vat-startup-finish': {
        endSpan(`vat-startup.${slogAttrs.vatID}`);
        break;
      }
      case 'start-replay': {
        startSpan(
          `vat-replay.${slogAttrs.vatID}`,
          spans.get(`vat.${slogAttrs.vatID}`),
        );
        break;
      }
      case 'finish-replay': {
        endSpan(`vat-replay.${slogAttrs.vatID}`);
        break;
      }
      case 'deliver': {
        // FIXME: Process the deliveries.
        const {
          vd: [delivery],
          kd: _2,
          ...attrs
        } = slogAttrs;
        startSpan(
          `deliver.${slogAttrs.vatID}`,
          spans.get(`vat.${slogAttrs.vatID}`),
          { delivery, ...attrs },
        );
        break;
      }
      case 'deliver-result': {
        const {
          dr: [status, _1, meterResult],
          ...attrs
        } = slogAttrs;
        endSpan(`deliver.${slogAttrs.vatID}`, {
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
        startSpan(
          `syscall.${slogAttrs.vatID}`,
          spans.get(`deliver.${slogAttrs.vatID}`),
          { syscall, ...attrs },
        );
        if (!ksc) {
          endSpan(`syscall.${slogAttrs.vatID}`, {});
        }
        break;
      }
      case 'syscall-result': {
        const {
          ksr: _1,
          vsr: [status],
          ...attrs
        } = slogAttrs;
        endSpan(`syscall.${slogAttrs.vatID}`, { status, ...attrs });
        break;
      }
      case 'cosmic-swingset-bootstrap-block-start': {
        currentPhase = 'bootstrap-block';
        startSpan(`bootstrap-block`, topSpan);
        break;
      }
      case 'cosmic-swingset-bootstrap-block-finish': {
        endSpan(`bootstrap-block`);
        currentPhase = 'idle';
        break;
      }
      case 'cosmic-swingset-begin-block': {
        currentPhase = 'begin-block';
        startSpan(`begin-block`, topSpan);
        endSpan(`begin-block`);
        currentPhase = 'block';
        startSpan(`block`, topSpan);
        break;
      }
      case 'cosmic-swingset-deliver-inbound': {
        spans.get(currentPhase).addEvent('deliver-inbound', slogAttrs, now);
        break;
      }
      case 'cosmic-swingset-bridge-inbound': {
        spans.get(currentPhase).addEvent('bridge-inbonud', slogAttrs, now);
        break;
      }
      case 'cosmic-swingset-end-block-start': {
        endSpan(`block`);
        currentPhase = 'end-block';
        startSpan(currentPhase, topSpan);
        break;
      }
      case 'cosmic-swingset-end-block-finish': {
        endSpan(`end-block`);
        currentPhase = 'idle';
        break;
      }
      case 'crank-start': {
        startSpan(
          `crank`,
          spans.get(currentPhase),
          shortenMessageAttrs(slogAttrs.message),
        );
        break;
      }
      case 'clist': {
        spans.get(`crank`).addEvent('clist', cleanAttrs(slogAttrs), now);
        break;
      }
      case 'crank-finish': {
        endSpan(`crank`);
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
