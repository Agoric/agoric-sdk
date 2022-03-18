// @ts-check
/**
 * Test steps with support for spreadsheet integration.
 */
import util from 'util';

// ack: https://stackoverflow.com/a/18147076/7963
const CSV = (() => {
  const fieldPattern = /("(?:(?:"")*[^"]*)*"|[^",\n]*)(?:,|\n|$)/g;

  /** @param { string } field */
  const unquote = field =>
    field.replace(/""/g, '"').replace(/^"/, '').replace(/"$/, '');

  /** @param { string } line */
  const splitFields = line =>
    [...line.matchAll(fieldPattern)].map(([_all, txt]) => unquote(txt));

  /** @param { string } content */
  const parse = content => content.split('\n').map(splitFields);

  return harden({ parse });
})();

// copy/paste from spreadsheet seems to give tab-separated data
export const TEXT = `
1	Starting LoC
		buy BLD	9,000
		stake BLD	9,000
		check BLD liened	0
		check RUN balance	0
		lien BLD	6,000
		borrow RUN	100
		check RUN debt	100
		check BLD liened	6,000
		check RUN balance	100
2	Extending LoC		cont
		borrow more RUN	100
		check RUN balance	200
		check RUN debt	200
		check BLD liened	6,000
3	Extending LoC - more BLD required		cont
		stake BLD	5,000
		lien BLD	8,000
		check BLD liened	8,000
		borrow more RUN	1,400
		check RUN debt	1,600
4	Extending LoC - CR increases (FAIL)
		buy BLD	80,000
		stake BLD	80,000
		lien BLD	8,000
		borrow RUN	1,000
		set Minting Ratio	16%
		borrow more RUN	500	fail
		check RUN balance	1,000
		check BLD liened	8,000
5	Full repayment		cont
		check BLD liened	8,000
		check RUN balance	1,000
		payoff RUN	1,000
		check RUN debt	0
		check BLD liened	0
		check RUN balance	0
6	Partial repayment - CR remains the same
		buy BLD	10,000
		stake BLD	10,000
		lien BLD	10,000
		borrow RUN	1,000
		pay down RUN	50
		check RUN balance	950
		check RUN debt	950
7	Partial repayment - CR increases*
		buy BLD	10,000
		stake BLD	10,000
		lien BLD	400
		borrow RUN	100
		set Minting Ratio	16%
		pay down RUN	5
		check RUN balance	95
		check BLD liened	400
9	Extending LoC - unbonded (FAIL)
		buy BLD	1,000
		stake BLD	800
		lien BLD	800
		borrow RUN	100
		slash	300
		check BLD staked	500
		borrow more RUN	50	fail
		check RUN balance	100
		check BLD liened	800
11	Partial repay - unbonded ok
		buy BLD	1,000
		stake BLD	800
		lien BLD	800
		borrow RUN	100
		slash	700
		check BLD liened	800
		check RUN balance	100
		pay down RUN	50
		check RUN balance	50
		check BLD liened	800
		check BLD staked	100
14	Add collateral - more BLD required (FAIL)
		buy BLD	1,000
		stake BLD	1,000
		lien BLD	800
		borrow RUN	100
		borrow more RUN	200	fail
		check RUN balance	100
		check BLD liened	800
15	Lower collateral
		buy BLD	1,000
		stake BLD	1,000
		lien BLD	800
		borrow RUN	100
		unlien BLD	400
		check RUN balance	100
		check BLD liened	400
16	Lower collateral - CR increase (FAIL)
		buy BLD	1,000
		stake BLD	1,000
		lien BLD	800
		borrow RUN	100
		set Minting Ratio	16%
		unlien BLD	400	fail
		check BLD liened	800
17	Lower collateral - unbonded ok
		buy BLD	1,000
		stake BLD	1,000
		lien BLD	800
		borrow RUN	100
		slash	770
		check BLD liened	800
		unlien BLD	400
		check RUN balance	100
		check BLD liened	400
18	Full repayment - CR and unbonded		cont
		set Minting Ratio	16%
		payoff RUN	100
		check RUN balance	0
		check BLD liened	0
`;

export const ROWS = CSV.parse(
  TEXT.replace(/,/g, '').replace(/\t/g, ',').trim(),
);

const decode = txt => {
  if ((txt || '').match(/^[0-9]+%$/)) {
    return [BigInt(txt.replace('%', '')), 100n];
  }
  if ((txt || '').match(/^[-0-9,]+$/)) {
    return BigInt(txt.replace(',', ''));
  }
  return txt;
};

const camelCase = txt =>
  (words => [
    words[0],
    ...words.slice(1).map(w => w.slice(0, 1).toUpperCase() + w.slice(1)),
  ])(txt.split(' ')).join('');

function* eachCase(rows) {
  let num;
  let label;
  let steps = [];
  for (const row of rows) {
    const [A, B, _C, cont] = row.map(txt => (txt === '' ? undefined : txt));
    if (A) {
      if (cont) {
        // continuation; not a new case
        // TOTO: preserve num, label
      } else {
        if (label) {
          yield [num, label, steps];
        }
        [num, label] = [A, B];
        steps = [];
      }
    } else {
      const [_A, _B, tag, expr, outcome] = row;
      if (tag) {
        if (outcome === 'fail') {
          steps.push([camelCase(tag), decode(expr), false]);
        } else {
          steps.push([camelCase(tag), decode(expr)]);
        }
      }
    }
  }
  if (label) {
    yield [num, label, steps];
  }
}

export const CASES = [...eachCase(ROWS)];

console.log('export const CASES = ');
console.log(util.inspect(CASES, false, 4));
