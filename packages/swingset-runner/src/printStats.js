const log = console.log;

export function printStats(stats, totalSteps) {
  const wk = 32;
  const wi = 9;
  const wf = 8;

  const h1 = `${'Stat'.padEnd(wk)}`;
  const d1 = `${''.padEnd(wk, '-')}`;

  const h2 = `${'Value'.padStart(wi)}`;
  const d2 = ` ${''.padStart(wi - 1, '-')}`;

  const h3 = `${'MaxValue'.padStart(wi)}`;
  const d3 = `  ${''.padStart(wi - 1, '-')}`;

  const h4 = `${'PerCrank'.padStart(wf)}`;
  const d4 = `${''.padStart(wf, '-')}`;

  log(`${h1} ${h2} ${h3} ${h4}`);
  log(`${d1} ${d2} ${d3} ${d4}`);

  for (const [key, value] of Object.entries(stats)) {
    if (!key.endsWith('Max')) {
      const maxKey = `${key}Max`;
      const col1 = `${key.padEnd(wk)}`;
      const col2 = `${String(value).padStart(wi)}`;
      const v3 = stats[maxKey] !== undefined ? stats[maxKey] : '';
      const col3 = `${String(v3).padStart(wi)}`;
      const col4 = `${String((value / totalSteps).toFixed(4)).padStart(wf)}`;
      log(`${col1} ${col2} ${col3} ${col4}`);
    }
  }
}
