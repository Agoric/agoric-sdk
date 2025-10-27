import { AmountMath, type NatAmount } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { mustMatch, objectMap } from '@agoric/internal';
import { createRequire } from 'module';
import { readFile } from 'node:fs/promises';
import { YieldProtocol } from '@agoric/portfolio-api/src/constants.js';
import {
  makeOfferArgsShapes,
  type AssetPlaceRef,
  type MovementDesc,
  type SeatKeyword,
} from '../src/type-guards-steps.js';
import {
  makeProposalShapes,
  PoolPlaces,
  type PoolKey,
} from '../src/type-guards.js';

/** OCap exception: infrastructure to make up for lack of import x from 'foo.txt' */
export const importText = (specifier: string, base): Promise<string> =>
  readFile(createRequire(base).resolve(specifier), 'utf8');

export const importCSV = (specifier: string, base: string) =>
  importText(specifier, base).then(parseCSV);

export type Dollars = `$${string}` | `-$${string}`;
export const numeral = (amt: Dollars) => amt.replace(/[$,]/g, '');

type Empty = Record<never, never>;

type MovementDescTemplate<V extends NatAmount | Dollars> = V extends NatAmount
  ? MovementDesc
  : V extends Dollars
    ? Omit<MovementDesc, 'amount'> & { amount: Dollars }
    : never;

export type RebalanceScenario<V extends NatAmount | Dollars = Dollars> = {
  description: string;
  before: Partial<Record<YieldProtocol, V>>;
  previous: string;
  proposal:
    | { give: Empty; want: Empty }
    | { give: { Deposit: V }; want: Empty }
    | { want: { Cash: V }; give: Empty };
  offerArgs: V extends NatAmount
    ? { flow?: MovementDesc[] }
    : { flow: MovementDescTemplate<V>[] } | undefined;
  after: Partial<Record<YieldProtocol, V>>;
  payouts: { Deposit?: V; Cash?: V };
  positionsNet: Dollars;
  offerNet: Dollars;
  operationNet: Dollars;
};

const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

export const parseCSV = (text: string): Array<string[]> =>
  text
    .trim()
    .split('\n')
    .map(line => parseCSVRow(line));

const parseCell = (prot: YieldProtocol | SeatKeyword, txt: string) => {
  if (!txt.startsWith('$')) return {};
  return { [prot]: txt as Dollars };
};

const parseProtocolAmounts = (
  row: string[],
): Partial<Record<YieldProtocol, Dollars>> => {
  const [aave, compound, usdn] = row.slice(6);
  return {
    ...parseCell('Aave', aave),
    ...parseCell('Compound', compound),
    ...parseCell('USDN', usdn),
  };
};

export const grokRebalanceScenarios = (data: Array<string[]>) => {
  const scenarios: Record<string, RebalanceScenario> = {};
  let currentScenario: Partial<RebalanceScenario> = {};

  let hd: string[] = [];
  let emptyHdCol = -1;
  let rownum = 0;

  for (const row of data) {
    rownum += 1;
    if (!hd.length) {
      hd = row;
      emptyHdCol = hd.findLastIndex(c => c.trim().length === 0) - 2;
      // console.debug(rownum, { emptyHdCol, hd, row });
    }
    // Skip completely empty rows or rows with only empty strings
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      if (currentScenario.description) {
        scenarios[currentScenario.description] =
          currentScenario as RebalanceScenario;
        currentScenario = {};
      }
      continue;
    }

    const [label, aave, compound, _usdn] = [row[0], ...row.slice(6)];
    const [_l, Deposit, Cash, _agoricLCA, _nobleICA, _acctEVM] = row;
    const [T2A, T2B, T2C] = row.slice(emptyHdCol);

    // Skip header row
    if (label === '' && aave === 'Aave' && compound === 'Compound') {
      continue;
    }

    switch (label) {
      case 'Description':
        currentScenario.description = T2A || '';
        break;
      case 'Before':
        currentScenario.before = parseProtocolAmounts(row);
        currentScenario.previous = T2A;
        break;
      case 'Offer: Give':
        currentScenario.proposal ||= { give: {}, want: {} };
        currentScenario.proposal.give = parseCell('Deposit', Deposit);
        break;
      case 'Offer: Want':
        currentScenario.proposal ||= { give: {}, want: {} };
        currentScenario.proposal!.want = parseCell('Cash', Cash);
        break;
      case 'flow move': {
        currentScenario.offerArgs ||= { flow: [] };
        const { flow } = currentScenario.offerArgs;

        const asPlaceRef = (pDef: string): AssetPlaceRef => {
          if (pDef.startsWith('Seat: '))
            return `<${pDef.slice('Seat: '.length) as SeatKeyword}>`;
          if (pDef.match(/^LCA/)) return `@agoric`;
          if (pDef.match(/^ICA/)) return `@noble`;
          if (pDef.match(/^GMP/)) return `@Arbitrum`;
          const { entries } = Object;
          const [poolKey] =
            entries(PoolPlaces).find(
              ([_k, p]) =>
                p.protocol === pDef &&
                ['noble', 'Arbitrum'].includes(p.chainName),
            ) || assert.fail(pDef);
          return poolKey as PoolKey;
        };

        if (!hd.length) throw Error('missing header');
        const [srcCol, destCol] = ['src', 'dest'].map(k =>
          row.findIndex(s => s === k),
        );
        assert(srcCol >= 0, `src not found in row ${rownum}`);
        assert(destCol >= 0, `dest not found in row ${rownum}`);
        // console.debug({ srcCol, destCol, hd, flow });
        const src = asPlaceRef(hd[srcCol]) as AssetPlaceRef;
        const dest = asPlaceRef(hd[destCol]);

        const amount = T2B as Dollars;
        amount?.startsWith('$') || assert.fail(`bad amount in row ${rownum}`);

        flow.push({ src, dest, amount });
        break;
      }
      case 'After':
        // console.debug('After row', row);
        currentScenario.after = parseProtocolAmounts(row);
        currentScenario.positionsNet = T2B as Dollars;
        break;
      case 'Payouts':
        currentScenario.payouts = {
          ...parseCell('Deposit', Deposit),
          ...parseCell('Cash', Cash),
        };
        currentScenario.offerNet = T2B as Dollars;
        currentScenario.operationNet = T2C as Dollars;
        // console.debug(
        //   'Payouts row',
        //   row,
        //   currentScenario.description,
        //   currentScenario.payouts,
        // );
        break;
      default:
      // pass
    }
  }

  // Add the last scenario if it exists
  if (currentScenario.description) {
    scenarios[currentScenario.description] =
      currentScenario as RebalanceScenario;
  }

  return scenarios;
};

export const withBrand = (
  scenario: RebalanceScenario<Dollars>,
  brand: Brand<'nat'>,
  feeBrand = brand,
): RebalanceScenario<NatAmount> => {
  const { make } = AmountMath;
  const unit = make(brand, 1_000_000n);
  const $ = (amt: Dollars): NatAmount =>
    multiplyBy(unit, parseRatio(numeral(amt), brand));
  const $$ = <C extends Record<string, Dollars>>(dollarCells: C) =>
    objectMap(dollarCells, a => $(a!));

  const needsFee = m =>
    m.dest === '@Arbitrum' ||
    ['Compound', 'Aave'].some(p => m.dest.startsWith(p) || m.src.startsWith(p));
  const withFee = m =>
    needsFee(m) ? { ...m, fee: { brand: feeBrand, value: 100n } } : m;

  const flow = scenario.offerArgs?.flow?.map(
    m => withFee({ ...m, amount: $(m.amount) }) as MovementDesc,
  );
  const offerArgs = flow ? harden({ flow }) : harden({});
  mustMatch(offerArgs, makeOfferArgsShapes(brand).rebalance);

  const proposal = objectMap(scenario.proposal, $$);
  mustMatch(proposal, makeProposalShapes(brand).rebalance);

  return harden({
    ...scenario,
    before: $$(scenario.before),
    proposal,
    offerArgs,
    after: $$(scenario.after),
    payouts: $$(scenario.payouts),
  });
};
