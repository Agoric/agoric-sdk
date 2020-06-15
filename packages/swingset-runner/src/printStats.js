const log = console.log;

// Return a string representation of a number with 4 digits of precision to the
// right of the decimal point -- unless it's an integer, in which case, in the
// interest of visual clarity, replace the fractional part with spaces.
function pn(n) {
  const str = n.toFixed(4);
  if (str.endsWith('.0000')) {
    return `${str.substring(0, str.length - 5)}     `;
  } else {
    return str;
  }
}

function isMainKey(key) {
  return !key.endsWith('Max') && !key.endsWith('Up') && !key.endsWith('Down');
}

export function printStats(stats, cranks) {
  const w1 = 32;
  const h1 = `${'Stat'.padEnd(w1)}`;
  const d1 = `${''.padEnd(w1, '-')}`;

  const w2 = 9;
  const h2 = `${'Value'.padStart(w2)}`;
  const d2 = ` ${''.padStart(w2 - 1, '-')}`;

  const w3 = 9;
  const h3 = `${'Incs'.padStart(w3)}`;
  const d3 = ` ${''.padStart(w3 - 1, '-')}`;

  const w4 = 9;
  const h4 = `${'Decs'.padStart(w4)}`;
  const d4 = ` ${''.padStart(w4 - 1, '-')}`;

  const w5 = 9;
  const h5 = `${'MaxValue'.padStart(w5)}`;
  const d5 = ` ${''.padStart(w5 - 1, '-')}`;

  const w6 = 8;
  const h6 = ` ${'PerCrank'.padStart(w6)}`;
  const d6 = ` ${''.padStart(w6, '-')}`;

  log(`In ${cranks} cranks:`);
  log(`${h1} ${h2} ${h3} ${h4} ${h5} ${h6}`);
  log(`${d1} ${d2} ${d3} ${d4} ${d5} ${d6}`);

  for (const [key, value] of Object.entries(stats)) {
    if (isMainKey(key)) {
      const col1 = `${key.padEnd(w1)}`;

      const col2 = `${String(value).padStart(w2)}`;

      const upKey = `${key}Up`;
      const v3 = stats[upKey] !== undefined ? stats[upKey] : '';
      const col3 = `${String(v3).padStart(w3)}`;

      const downKey = `${key}Down`;
      const v4 = stats[downKey] !== undefined ? stats[downKey] : '';
      const col4 = `${String(v4).padStart(w4)}`;

      const maxKey = `${key}Max`;
      const v5 = stats[maxKey] !== undefined ? stats[maxKey] : '';
      const col5 = `${String(v5).padStart(w5)}`;

      const col6 = `${pn(value / cranks).padStart(w6)}`;

      log(`${col1} ${col2} ${col3} ${col4} ${col5}  ${col6}`);
    }
  }
}

export function printBenchmarkStats(statsBefore, statsAfter, cranks, rounds) {
  const w1 = 32;
  const h1 = `${'Stat'.padEnd(w1)}`;
  const d1 = `${''.padEnd(w1, '-')}`;

  const w2 = 6;
  const h2 = `${'Delta'.padStart(w2)}`;
  const d2 = ` ${''.padStart(w2 - 1, '-')}`;

  const w3 = 9;
  const h3 = `${'PerRound'.padStart(w3)}`;
  const d3 = ` ${''.padStart(w3 - 1, '-')}`;

  // eslint-disable-next-line prettier/prettier
  log(`In ${cranks} cranks over ${rounds} rounds (${pn(cranks/rounds).trim()} cranks/round):`);
  log(`${h1} ${h2} ${h3}`);
  log(`${d1} ${d2} ${d3}`);

  // Note: the following assumes statsBefore and statsAfter have the same keys.
  for (const [key, value] of Object.entries(statsBefore)) {
    if (isMainKey(key)) {
      const col1 = `${key.padEnd(w1)}`;
      const delta = statsAfter[key] - value;
      const col2 = `${String(delta).padStart(w2)}`;
      const col3 = `${pn(delta / rounds).padStart(w3)}`;
      log(`${col1} ${col2} ${col3}`);
    }
  }
}
