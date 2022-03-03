/**
 * Test steps with support for spreadsheet integration.
 */
import util from 'util';
import * as CSV from './csvParse.js';

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
		set Collateralization Ratio	750%	
		borrow more RUN	500	fail
		check RUN balance	1,000	
		check BLD liened	8,000	
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
