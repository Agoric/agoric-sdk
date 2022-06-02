/* global globalThis VatData */
/* set up globalThis.handleCommand for running test scripts

See avaXS.js for the way this is run inside an xsnap process.

issueCommand is provided by xsnap.
test global is defined in avaAssertXS.js .
HandledPromise is defined by eventual send shim.

*/
/* global __dirname, __filename, issueCommand, test */
// @ts-check
/// <reference types="ses" />
/// <reference types="@endo/eventual-send" />

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param { { testNames: string[] } |
 *          { bundleSource: [string, ...unknown[]] } |
 *          TapMessage | Summary } item
 * @typedef {import('./avaXS').Summary} Summary
 */
function send(item) {
  const msg = encoder.encode(JSON.stringify(item)).buffer;
  return issueCommand(msg);
}

/**
 * @param { string } startFilename
 * @param {...unknown} args
 */
const bundleSource = async (startFilename, ...args) => {
  const msg = await send({ bundleSource: [startFilename, ...args] });
  return JSON.parse(decoder.decode(msg));
};

const path = {
  dirname: s => s.substring(0, s.lastIndexOf('/')),
};

const wrap = (label, obj) =>
  new Proxy(obj, {
    get: (target, name) => console.log({ label, target, name }),
  });

class URLStub {
  constructor(url, base) {
    if (base) throw Error('not impl');
    this.pathname = url.replace(/file:/, '');
    this.href = url;
    console.log('new URL@@', { url, base, pathname: this.pathname });
  }
}

const harness = test.createHarness(send); // ISSUE: global mutable state

const testRequire = function require(specifier) {
  switch (specifier) {
    case 'ava':
      return test;
    case 'ses':
      return undefined;
    case 'path':
      console.log('@@substituting path.dirname');
      return path;
    case '@endo/ses-ava':
      return { wrapTest: test => test };
    case '@endo/init':
    case '@endo/init/debug.js':
      return undefined;
    case '@agoric/install-metering-and-ses':
      console.log('TODO: @agoric/install-metering-and-ses');
      return undefined;
    case '@endo/bundle-source':
      return bundleSource;
    default:
      throw Error(specifier);
  }
};

/** @param {ArrayBuffer} rawMessage */
function handler(rawMessage) {
  /**
   * @type {{ method: 'loadScript', source: string } | { method: 'runTest', name: string }}
   */
  const msg = JSON.parse(decoder.decode(rawMessage));

  switch (msg.method) {
    case 'loadScript': {
      const { source } = msg;
      const virtualObjectGlobals =
        // @ts-ignore
        // eslint-disable-next-line no-undef
        typeof VatData !== 'undefined' ? { VatData } : {};
      console.log('@@compartment URL?', { URL }, new URL('abc'));
      // @ts-ignore How do I get ses types in scope?!?!?!
      const c = new Compartment({
        require: testRequire,
        __dirname,
        __filename,
        console,
        // @ts-ignore
        assert,
        // @ts-ignore
        HandledPromise,
        URL: URLStub,
        TextEncoder,
        TextDecoder,
        ...virtualObjectGlobals,
      });
      try {
        c.evaluate(`(${source}\n)()`);
        send({ testNames: harness.testNames() });
      } catch (ex) {
        console.log('loadScript threw', globalThis.getStackString(ex));
        throw Error(`avaHandler: loadScript failed: ${ex.message}`);
      }
      break;
    }

    case 'runTest': {
      const { name } = msg;
      harness.run(name).catch(ex =>
        send({
          status: 'not ok',
          message: `${name} threw: ${ex.message}`,
        }),
      );
      break;
    }

    default:
      console.log('bad method', msg);
  }
  return undefined;
}

globalThis.handleCommand = harden(handler);
