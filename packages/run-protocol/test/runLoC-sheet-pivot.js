import { ROWS } from './runLoC-test-case-sheet.js';

const decode = txt =>
  txt.match(/^[-0-9,]+$/) ? BigInt(txt.replace(',', '')) : txt;

function* pivot(rows) {
  for (const row of rows) {
    const [
      _a,
      _b,
      testNum,
      description,
      _action,
      _runPerBld,
      rateBefore,
      rateAfter,
      runBefore,
      runDelta,
      runAfter,
      staked,
      lienedBefore,
      lienedDelta,
      lienedAfter,
    ] = row.map(decode);
    if (!(staked > 0n)) continue;
    yield [Number(testNum), description];
    yield [null, null, 'buy BLD', staked];
    yield [null, null, 'stake BLD', staked];
    yield [null, null, 'check BLD liened', lienedBefore];
    yield [null, null, 'check RUN balance', runBefore];
    if (lienedDelta > 0) {
      yield [null, null, 'lien BLD', lienedDelta];
    }
    if (runDelta > 0) {
      yield [null, null, 'borrow RUN', runDelta];
    } else if (runDelta < 0) {
      yield [null, null, 'pay down RUN', -runDelta];
    }
    yield [null, null, 'check RUN balance', runAfter];
    if (rateAfter) {
      yield [null, null, 'set Collaterization ratio', rateAfter];
    }
    // if (lienedDelta < 0) {
    //   yield [null, null, 'XXX lien BLD', lienedDelta];
    // }
    yield [null, null, 'check BLD liened', lienedAfter];
  }
}

const fmtRow = cells =>
  `${cells.map(value => (value === null ? '' : `${value}`)).join(',')}\n`;

const main = stdout => {
  for (const row of pivot(ROWS)) {
    stdout.write(fmtRow(row));
  }
};

/* global process */
main(process.stdout);
