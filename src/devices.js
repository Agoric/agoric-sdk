// This file defines some "device drivers" that could be used in calls to
// `controller.addVat`

export function buildSharedStringTable() {
  const sharedTable = new Map();

  function attenuatorSource(e) {
    const { table } = e;
    // eslint-disable-next-line global-require
    const harden = require('@agoric/harden');
    return harden({
      get(key) {
        return table.get(`${key}`);
      },
      set(key, value) {
        table.set(`${key}`, `${value}`);
      },
      has(key) {
        return table.has(`${key}`);
      },
    });
  }

  return {
    attenuatorSource: `(${attenuatorSource})`,
    table: sharedTable,
  };
}

export function buildInbound() {
  const bridge = { inboundCallback: undefined };

  function deliverInbound(sender, data) {
    if (!bridge.inboundCallback) {
      throw new Error('inboundCallback must be defined first');
    }
    try {
      bridge.inboundCallback(`${sender}`, `${data}`);
    } catch (e) {
      console.log(`error during inboundCallback: ${e} ${e.message}`);
    }
  }

  function attenuatorSource(e) {
    // eslint-disable-next-line no-shadow
    const { bridge } = e;
    // eslint-disable-next-line global-require
    const harden = require('@agoric/harden');
    return harden({
      registerInboundCallback(f) {
        bridge.inboundCallback = f;
      },
    });
  }

  return {
    attenuatorSource: `(${attenuatorSource})`,
    bridge,
    deliverInbound,
  };
}

export function buildChannel() {
  const bridge = new Map();
  // receiverMachineName -> inboundCallback

  function attenuatorSource(e) {
    // eslint-disable-next-line no-shadow
    const { bridge } = e;
    // eslint-disable-next-line global-require
    const harden = require('@agoric/harden');
    return harden({
      registerInboundCallback(myMachineName, f) {
        bridge.set(myMachineName, f);
      },
      sendOverChannel(fromMachineName, toMachineName, data) {
        const callback = bridge.get(toMachineName);
        if (!callback) {
          throw new Error('callback must be defined first');
        }
        try {
          callback(`${fromMachineName}`, `${data}`);
        } catch (err) {
          console.log(`error during callback: ${e} ${e.message}`);
        }
      },
    });
  }

  return {
    attenuatorSource: `(${attenuatorSource})`,
    bridge,
  };
}
