import test from 'ava';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import type { NetworkSpec } from '../../src/network/network-spec.js';
import { makeGraphFromDefinition } from '../../src/network/buildGraph.js';
import { planRebalanceFlow } from '../../src/plan-solve.js';

const brand = Far('TestBrand') as any;
const feeBrand = Far('TestFeeBrand') as any;
const makeAmt = (v: bigint) => AmountMath.make(brand as any, v);

test('NetworkSpec minimal validation via builder', t => {
  const base: NetworkSpec = {
    chains: [
      { name: 'A', control: 'local' },
      { name: 'B', control: 'local' },
    ],
    pools: [],
    links: [],
    localPlaces: [],
  } as any;
  t.notThrows(() => makeGraphFromDefinition(base, {}, {}, Far('B'), feeBrand));
});

test('makeGraphFromDefinition adds intra-chain edges and appends inter edges with sequential ids', t => {
  const net: NetworkSpec = {
    chains: [
      { name: 'Arbitrum', control: 'axelar' },
      { name: 'Ethereum', control: 'axelar' },
    ],
    pools: [
      { pool: 'Aave_Arbitrum', chain: 'Arbitrum', protocol: 'Aave' },
      { pool: 'Compound_Ethereum', chain: 'Ethereum', protocol: 'Compound' },
    ],
    localPlaces: [],
    links: [
      {
        src: '@Arbitrum',
        dest: '@Ethereum',
        transfer: 'fastusdc',
        variableFeeBps: 0,
        timeSec: 10,
      },
      {
        src: '@Ethereum',
        dest: '@Arbitrum',
        transfer: 'fastusdc',
        variableFeeBps: 0,
        timeSec: 10,
      },
    ],
  } as any;
  const graph = makeGraphFromDefinition(net, {}, {}, brand, feeBrand);
  const leafCount = 2; // Aave_Arbitrum, Compound_Ethereum
  const expectedIntra = leafCount * 2; // bidirectional
  t.true(graph.edges.length >= expectedIntra + net.links.length);
  const interEdges = graph.edges.filter(
    e => e.src.startsWith('@') && e.dest.startsWith('@'),
  );
  t.is(interEdges.length, net.links.length);
  // Edge ids for inter edges should be the last ones appended in order
  const sortedIds = interEdges
    .map(e => Number(e.id.slice(1)))
    .sort((a, b) => a - b);
  const minInterId = expectedIntra; // intra edges allocated first
  t.true(sortedIds[0] >= minInterId, 'inter edges start after intra edges');
});

test('planRebalanceFlow uses NetworkSpec (legacy links param ignored at type level)', async t => {
  const net: NetworkSpec = {
    chains: [
      { name: 'Arbitrum', control: 'axelar' },
      { name: 'Avalanche', control: 'axelar' },
    ],
    pools: [
      { pool: 'Aave_Arbitrum', chain: 'Arbitrum', protocol: 'Aave' },
      { pool: 'Beefy_re7_Avalanche', chain: 'Avalanche', protocol: 'Beefy' },
    ],
    localPlaces: [],
    links: [
      {
        src: '@Arbitrum',
        dest: '@Avalanche',
        transfer: 'fastusdc',
        variableFeeBps: 0,
        timeSec: 10,
      },
      {
        src: '@Avalanche',
        dest: '@Arbitrum',
        transfer: 'fastusdc',
        variableFeeBps: 0,
        timeSec: 10,
      },
    ],
  } as any;
  const current = {
    Aave_Arbitrum: makeAmt(50n),
    Beefy_re7_Avalanche: makeAmt(0n),
  } as any;
  const target = {
    Aave_Arbitrum: makeAmt(20n),
    Beefy_re7_Avalanche: makeAmt(30n),
  } as any;
  const res = await planRebalanceFlow({
    network: net,
    current,
    target,
    brand,
    feeBrand,
    mode: 'cheapest',
  });
  // Ensure only the two provided inter edges (plus intra) exist, not link-derived ones
  const hubEdges = res.graph.edges.filter(
    e => e.src.startsWith('@') && e.dest.startsWith('@'),
  );
  t.is(hubEdges.length, 2);
  t.true(res.steps.length > 0);
});
