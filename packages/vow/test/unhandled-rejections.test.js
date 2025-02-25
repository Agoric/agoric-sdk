import {
  annihilate,
  startLife,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { makeExpectUnhandledRejection } from '@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js';
import { makeGcAndFinalize } from '@agoric/internal/src/lib-nodejs/gc-and-finalize.js';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { prepareVowTools } from '../vat.js';

const expectUnhandled = makeExpectUnhandledRejection({
  test,
  importMetaUrl: import.meta.url,
});

const gcAndFinalize = makeGcAndFinalize(engineGC);
test.afterEach.always(gcAndFinalize);

const shorten = vow => vow.payload.vowV0.shorten();

const DEFAULT_ERROR_MESSAGE = 'some kind of rejection';

const makeRejectedVow = (
  { makeVowKit },
  reason = Error(DEFAULT_ERROR_MESSAGE),
) => {
  const { resolver, vow } = makeVowKit();
  resolver.reject(reason);
  return vow;
};

/**
 * A vow on which `shorten` is called, and is then rejected in the same
 * incarnation (baseline, should not trigger the unhandled rejection handler)
 */
test.serial('vow shortened, then rejected', async t => {
  annihilate();

  await startLife(async baggage => {
    const zone = makeDurableZone(baggage, 'durableRoot');
    const vowTools = prepareVowTools(zone);

    const testVowKit = vowTools.makeVowKit();

    const shortenedP = shorten(testVowKit.vow);
    testVowKit.resolver.reject(Error(DEFAULT_ERROR_MESSAGE));
    await t.throwsAsync(shortenedP, {
      message: DEFAULT_ERROR_MESSAGE,
    });
  });
});

/**
 * A vow which is resolved with a rejected promise, and then on which `shorten`
 * is called in the same turn (it triggers a different ephemera code path, but,
 * like above, should not trigger the unhandled rejection handler)
 */
test.serial('vow resolved to rejected promise, then shortened', async t => {
  annihilate();

  await startLife(async baggage => {
    const zone = makeDurableZone(baggage, 'durableRoot');
    const vowTools = prepareVowTools(zone);

    const testVowKit = vowTools.makeVowKit();

    const rejection = Promise.reject(Error(DEFAULT_ERROR_MESSAGE));
    testVowKit.resolver.resolve(rejection);
    await t.throwsAsync(() => shorten(testVowKit.vow), {
      message: DEFAULT_ERROR_MESSAGE,
    });
  });
});

/**
 * A vow which is rejected, and then `shorten` is called after the vow's status
 * has recorded the rejection. This should trigger the unhandled rejection
 * tracker, but not result in an unhandled rejection.
 */
test.serial('vow rejected, then shorten', async t => {
  annihilate();

  await startLife(async baggage => {
    const zone = makeDurableZone(baggage, 'durableRoot');
    const vowTools = prepareVowTools(zone);

    const vow = makeRejectedVow(vowTools);
    await t.throwsAsync(() => shorten(vow), {
      message: DEFAULT_ERROR_MESSAGE,
    });
  });
});

/**
 * a vow which is shortened, then goes through an upgrade before being rejected,
 * then shortened again. This should similarly trigger the unhandled rejection
 * tracker, but not result in an unhandled rejection.
 */
test.serial(
  'vow shortened, upgraded, rejected, then shortened again',
  async t => {
    annihilate();

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      const vowTools = prepareVowTools(zone);

      const testVowKit = zone.makeOnce('testVowKit', () =>
        vowTools.makeVowKit(),
      );

      // This shorten should never settle, because the vow is only settled in a
      // future incarnation.
      void shorten(testVowKit.vow).then(
        value => t.fail(value),
        reason => t.fail(reason),
      );
    });

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      prepareVowTools(zone);

      const testVowKit = zone.makeOnce('testVowKit', () =>
        t.fail('need testVowKit in baggage'),
      );

      testVowKit.resolver.reject(Error(DEFAULT_ERROR_MESSAGE));

      await t.throwsAsync(() => shorten(testVowKit.vow), {
        message: DEFAULT_ERROR_MESSAGE,
      });
    });
  },
);

/**
 * A vow which is rejected without being shortened, then dropped. This should
 * trigger the unhandled rejection promise reporting after gc.
 */
test.serial(expectUnhandled(1), 'vow rejected, then dropped', async t => {
  annihilate();

  await startLife(async baggage => {
    const zone = makeDurableZone(baggage, 'durableRoot');
    const vowTools = prepareVowTools(zone);

    makeRejectedVow(vowTools);
    await gcAndFinalize();
  });

  await gcAndFinalize();
  t.pass();
});

/**
 * A vow which is rejected without being shortened, but stored in baggage. Then
 * after an upgrade the vow is handled. This should trigger an unhandled
 * rejection with our custom "not handled before upgrade" error, followed by the
 * "handling prior incarnation" warning.
 *
 * The rejection reason *is* storable.
 *
 * TODO(#11027): `startLife` tests don't silence dead incarnation's unhandled
 * promise rejections.
 */
test.serial(
  expectUnhandled(2),
  'vow rejected with storable reason, upgraded, then handled',
  async t => {
    annihilate();

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      const vowTools = prepareVowTools(zone);

      zone.makeOnce('testVow', () => makeRejectedVow(vowTools));
    });

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      prepareVowTools(zone);

      const vow = zone.makeOnce('testVow', () =>
        t.fail('need testVow in baggage'),
      );

      await t.throwsAsync(() => shorten(vow), {
        message: DEFAULT_ERROR_MESSAGE,
      });
    });
  },
);

/**
 * A vow which is rejected without being shortened, but stored in baggage. Then
 * after an upgrade the vow is handled. This should trigger an unhandled
 * rejection with our custom "not handled before upgrade" error, followed by the
 * "handling prior incarnation" warning.
 *
 * The rejection reason *is not* storable.
 */
test.serial(
  expectUnhandled(2),
  'vow rejected with non-storable reason, upgraded, then handled',
  async t => {
    annihilate();

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      const vowTools = prepareVowTools(zone);

      const nonStorable = Far('non-storable', {
        toString() {
          return 'is not storable';
        },
      });
      zone.makeOnce('testVow', () => makeRejectedVow(vowTools, nonStorable));
    });

    await startLife(async baggage => {
      const zone = makeDurableZone(baggage, 'durableRoot');
      prepareVowTools(zone);

      const vow = zone.makeOnce('testVow', () =>
        t.fail('need testVow in baggage'),
      );

      await t.throwsAsync(() => shorten(vow), {
        message: `Vow rejection reason was not stored: "[Alleged: non-storable]"`,
      });
    });
  },
);
