import test from 'ava';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import {
  validateNetworkDefinition,
  type NetworkDefinition,
} from '../../src/network/types.js';
import { makeGraphFromDefinition } from '../../src/network/buildGraph.js';
import { planRebalanceFlow } from '../../src/plan-solve.js';

const brand = Far('TestBrand');
const makeAmt = (v: bigint) => AmountMath.make(brand as any, v);

test('validateNetworkDefinition rejects bad edges', t => {
  const base: NetworkDefinition = { nodes: ['@A', '@B'], edges: [] };
  // Unknown node
  t.throws(
    () =>
      validateNetworkDefinition({
        ...base,
        edges: [{ src: '@A', dest: '@C', variableFee: 0 }],
      }),
    {
      message: /edge dest missing node/i,
    },
  );
  // Negative fee
  t.throws(
    () =>
      validateNetworkDefinition({
        ...base,
        edges: [{ src: '@A', dest: '@B', variableFee: -1 }],
      }),
    {
      message: /negative variableFee/i,
    },
  );
});

test('makeGraphFromDefinition adds intra-chain edges and appends inter edges with sequential ids', t => {
  const net: NetworkDefinition = {
    nodes: ['Aave_Arbitrum', 'Compound_Ethereum', '@Arbitrum', '@Ethereum'],
    edges: [
      { src: '@Arbitrum', dest: '@Ethereum', variableFee: 0, timeSec: 10 },
      { src: '@Ethereum', dest: '@Arbitrum', variableFee: 0, timeSec: 10 },
    ],
  };
  validateNetworkDefinition(net);
  const graph = makeGraphFromDefinition(net, {}, {}, brand as any);
  const leafCount = 2; // Aave_Arbitrum, Compound_Ethereum
  const expectedIntra = leafCount * 2; // bidirectional
  t.true(graph.edges.length >= expectedIntra + net.edges.length);
  const interEdges = graph.edges.filter(
    e => e.src.startsWith('@') && e.dest.startsWith('@'),
  );
  t.is(interEdges.length, net.edges.length);
  // Edge ids for inter edges should be the last ones appended in order
  const sortedIds = interEdges
    .map(e => Number(e.id.slice(1)))
    .sort((a, b) => a - b);
  const minInterId = expectedIntra; // intra edges allocated first
  t.true(sortedIds[0] >= minInterId, 'inter edges start after intra edges');
});

test('planRebalanceFlow uses network and ignores legacy links param', async t => {
  const net: NetworkDefinition = {
    nodes: ['Aave_Arbitrum', 'Beefy_re7_Avalanche', '@Arbitrum', '@Avalanche'],
    edges: [
      { src: '@Arbitrum', dest: '@Avalanche', variableFee: 0, timeSec: 10 },
      { src: '@Avalanche', dest: '@Arbitrum', variableFee: 0, timeSec: 10 },
    ],
  };
  validateNetworkDefinition(net);
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
    brand: brand as any,
    // bogus links that would throw if processed (unknown chains)
    links: [
      { srcChain: 'X', destChain: 'Y', variableFee: 0, timeFixed: 1 } as any,
    ],
    mode: 'cheapest',
  });
  // Ensure only the two provided inter edges (plus intra) exist, not link-derived ones
  const hubEdges = res.graph.edges.filter(
    e => e.src.startsWith('@') && e.dest.startsWith('@'),
  );
  t.is(hubEdges.length, 2);
  t.true(res.steps.length > 0);
});
