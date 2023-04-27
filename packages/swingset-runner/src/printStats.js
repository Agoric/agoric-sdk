import fs from 'fs';

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

export function organizeMainStats(rawStats, cranks) {
  const stats = {
    cranks,
    data: {},
  };
  for (const [key, value] of Object.entries(rawStats)) {
    if (isMainKey(key)) {
      const upKey = `${key}Up`;
      const downKey = `${key}Down`;
      const maxKey = `${key}Max`;
      stats.data[key] = {
        value,
        up: rawStats[upKey],
        down: rawStats[downKey],
        max: rawStats[maxKey],
        perCrank: value / cranks,
      };
    }
  }
  return stats;
}

export function printMainStats(stats) {
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

  log(`In ${stats.cranks} cranks:`);
  log(`${h1} ${h2} ${h3} ${h4} ${h5} ${h6}`);
  log(`${d1} ${d2} ${d3} ${d4} ${d5} ${d6}`);

  const data = stats.data;
  for (const [key, entry] of Object.entries(data)) {
    const col1 = `${key.padEnd(w1)}`;

    const col2 = `${String(entry.value).padStart(w2)}`;

    const v3 = entry.up !== undefined ? entry.up : '';
    const col3 = `${String(v3).padStart(w3)}`;

    const v4 = entry.down !== undefined ? entry.down : '';
    const col4 = `${String(v4).padStart(w4)}`;

    const v5 = entry.max !== undefined ? entry.max : '';
    const col5 = `${String(v5).padStart(w5)}`;

    const col6 = `${pn(entry.value / stats.cranks).padStart(w6)}`;

    log(`${col1} ${col2} ${col3} ${col4} ${col5}  ${col6}`);
  }
}

export function organizeBenchmarkStats(rawBefore, rawAfter, cranks, rounds) {
  const stats = {
    cranks,
    rounds,
    cranksPerRound: cranks / rounds,
    data: {},
  };

  // Note: the following assumes rawBefore and rawAfter have the same keys.
  for (const [key, value] of Object.entries(rawBefore)) {
    if (isMainKey(key)) {
      const delta = rawAfter[key] - value;
      stats.data[key] = {
        delta,
        deltaPerRound: delta / rounds,
      };
    }
  }
  return stats;
}

export function printBenchmarkStats(stats) {
  const w1 = 32;
  const h1 = `${'Stat'.padEnd(w1)}`;
  const d1 = `${''.padEnd(w1, '-')}`;

  const w2 = 6;
  const h2 = `${'Delta'.padStart(w2)}`;
  const d2 = ` ${''.padStart(w2 - 1, '-')}`;

  const w3 = 9;
  const h3 = `${'PerRound'.padStart(w3)}`;
  const d3 = ` ${''.padStart(w3 - 1, '-')}`;

  const cpr = pn(stats.cranksPerRound).trim();
  log(
    `In ${stats.cranks} cranks over ${stats.rounds} rounds (${cpr} cranks/round):`,
  );
  log(`${h1} ${h2} ${h3}`);
  log(`${d1} ${d2} ${d3}`);

  const data = stats.data;
  for (const [key, entry] of Object.entries(data)) {
    const col1 = `${key.padEnd(w1)}`;
    const col2 = `${String(entry.delta).padStart(w2)}`;
    const col3 = `${pn(entry.deltaPerRound).padStart(w3)}`;
    log(`${col1} ${col2} ${col3}`);
  }
}

export function outputStats(statsFile, main, benchmark) {
  const str = JSON.stringify({ main, benchmark }, undefined, 2);
  fs.writeFileSync(statsFile, str);
}
