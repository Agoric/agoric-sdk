import test from 'ava';

import { BlockCalculator } from '../src/utils.ts';

test('BlockCalculator defaults without block history', t => {
  const blocks = new BlockCalculator();

  t.is(blocks.meanBlockTimeMs, 0);
  t.is(blocks.timeMsAt(0), 0);
  t.is(blocks.timeMsAt(-1), 0);
  t.is(blocks.timeMsAt(5, 123), 123);
  t.is(blocks.heightAt(0), 0n);
  t.is(blocks.heightAt(-1), 0n);
  t.is(blocks.heightAt(5, 123n), 123n);
  t.is(blocks.heightForTime(-1), 0n);
  t.is(blocks.heightForTime(1), 0n);
});

test('BlockCalculator appends blocks and reports indexed history', t => {
  const blocks = new BlockCalculator();

  blocks.append(10n, 1_000);
  t.is(blocks.meanBlockTimeMs, 0);
  t.is(blocks.timeMsAt(0), 1_000);
  t.is(blocks.timeMsAt(-1), 1_000);
  t.is(blocks.heightAt(0), 10n);
  t.is(blocks.heightAt(-1), 10n);

  blocks.append(12n, 3_000);
  blocks.append(14n, 5_000);

  t.is(blocks.meanBlockTimeMs, 1_000);
  t.is(blocks.timeMsAt(0), 1_000);
  t.is(blocks.timeMsAt(1), 3_000);
  t.is(blocks.timeMsAt(-1), 5_000);
  t.is(blocks.heightAt(0), 10n);
  t.is(blocks.heightAt(1), 12n);
  t.is(blocks.heightAt(-1), 14n);
});

test('BlockCalculator resolves heights within the retained window', t => {
  const blocks = new BlockCalculator();
  blocks.append(10n, 1_000);
  blocks.append(12n, 3_000);
  blocks.append(14n, 5_000);

  t.is(blocks.heightForTime(1_000), 10n);
  t.is(blocks.heightForTime(2_999), 10n);
  t.is(blocks.heightForTime(3_000), 12n);
  t.is(blocks.heightForTime(4_999), 12n);
  t.is(blocks.heightForTime(5_000), 14n);
  t.is(blocks.heightForTime(6_000), 14n);
});

test('BlockCalculator extrapolates heights before the retained window', t => {
  const blocks = new BlockCalculator();
  blocks.append(10n, 1_000);
  blocks.append(12n, 3_000);
  blocks.append(14n, 5_000);

  t.is(blocks.meanBlockTimeMs, 1_000);
  t.is(blocks.heightForTime(999), 10n);
  t.is(blocks.heightForTime(0), 9n);
  t.is(blocks.heightForTime(-1_000), 8n);
});

test('BlockCalculator avoids extrapolation without positive mean block time', t => {
  const blocks = new BlockCalculator();
  blocks.append(10n, 1_000);

  t.is(blocks.meanBlockTimeMs, 0);
  t.is(blocks.heightForTime(0), 10n);
});

test('BlockCalculator prunes old history to the requested time range', t => {
  const blocks = new BlockCalculator();
  blocks.append(1n, 100);
  blocks.append(2n, 200);
  blocks.append(3n, 300);
  blocks.append(4n, 450);

  blocks.prune(200);
  t.is(blocks.timeMsAt(0), 300);
  t.is(blocks.timeMsAt(-1), 450);
  t.is(blocks.heightAt(0), 3n);
  t.is(blocks.heightAt(-1), 4n);
  t.is(blocks.meanBlockTimeMs, 150);
  t.is(blocks.heightForTime(250), 3n);

  blocks.prune(0);
  t.is(blocks.timeMsAt(0), 450);
  t.is(blocks.timeMsAt(-1), 450);
  t.is(blocks.heightAt(0), 4n);
  t.is(blocks.heightAt(-1), 4n);
  t.is(blocks.meanBlockTimeMs, 0);
});
