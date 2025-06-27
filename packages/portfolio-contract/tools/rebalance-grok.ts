import { readFile } from 'node:fs/promises';
import { createRequire } from 'module';
import type { YieldProtocol } from '../src/constants.js';

/** OCap exception: infrastructure to make up for lack of import x from 'foo.txt' */
export const importText = (specifier: string, base): Promise<string> =>
  readFile(createRequire(base).resolve(specifier), 'utf8');

export const importCSV = (specifier: string, base: string) =>
  importText(specifier, base).then(parseCSV);

export type Dollars = `$${string}` | `-$${string}`;
export const numeral = (amt: Dollars) => amt.replace(/[$,]/g, '');

export type RebalanceScenario = {
  description: string;
  before: Partial<Record<YieldProtocol, Dollars>>;
  proposal: {
    give: Partial<Record<YieldProtocol, Dollars>>;
    want: Partial<Record<YieldProtocol, Dollars>>;
  };
  offerArgs: Partial<Record<YieldProtocol, Dollars>>;
  after: Partial<Record<YieldProtocol, Dollars>>;
  payouts: Partial<Record<YieldProtocol, Dollars>>;
  positionsNet: Dollars;
  offerNet: Dollars;
  operationNet: Dollars;
};

const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
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

const parseCell = (prot: YieldProtocol, txt: string) => {
  if (!txt.startsWith('$')) return {};
  return { [prot]: txt as Dollars };
};

const parseProtocolAmounts = ([_A, aave, compound, usdn]: string[]): Partial<
  Record<YieldProtocol, Dollars>
> => {
  return {
    ...parseCell('Aave', aave),
    ...parseCell('Compound', compound),
    ...parseCell('USDN', usdn),
  };
};

export const grokRebalanceScenarios = (data: Array<string[]>) => {
  const scenarios: Record<string, RebalanceScenario> = {};
  let currentScenario: Partial<RebalanceScenario> = {};

  for (const row of data) {
    // Skip completely empty rows or rows with only empty strings
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      if (currentScenario.description) {
        scenarios[currentScenario.description] =
          currentScenario as RebalanceScenario;
        currentScenario = {};
      }
      continue;
    }

    const [label, aave, compound, usdn, E, F, G] = row;

    // Skip header row
    if (label === '' && aave === 'Aave' && compound === 'Compound') {
      continue;
    }

    if (label === 'Description') {
      currentScenario.description = E || '';
    } else if (label === 'Before') {
      currentScenario.before = parseProtocolAmounts(row);
    } else if (label === 'Offer: Give') {
      currentScenario.proposal = {
        give: parseProtocolAmounts(row),
        want: {},
      };
    } else if (label === 'Offer: Want') {
      currentScenario.proposal!.want = parseProtocolAmounts(row);
    } else if (label === 'offerArgs') {
      currentScenario.offerArgs = parseProtocolAmounts(row);
    } else if (label === 'After') {
      // console.debug('After row', row);
      currentScenario.after = parseProtocolAmounts(row);
      currentScenario.positionsNet = F as Dollars;
    } else if (label === 'Payouts') {
      currentScenario.payouts = parseProtocolAmounts(row);
      currentScenario.offerNet = F as Dollars;
      currentScenario.operationNet = G as Dollars;
      // console.debug(
      //   'Payouts row',
      //   row,
      //   currentScenario.description,
      //   currentScenario.payouts,
      // );
    }
  }

  // Add the last scenario if it exists
  if (currentScenario.description) {
    scenarios[currentScenario.description] =
      currentScenario as RebalanceScenario;
  }

  return scenarios;
};
