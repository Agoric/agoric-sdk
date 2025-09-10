export interface NetworkEdge {
  src: string;
  dest: string;
  variableFee: number;
  timeSec?: number;
  fixedFee?: number;
  capacity?: number;
  tags?: string[];
}
export interface NetworkDefinition {
  nodes: string[];
  edges: NetworkEdge[];
}
export const validateNetworkDefinition = (net: NetworkDefinition) => {
  const nodeSet = new Set(net.nodes);
  for (const e of net.edges) {
    if (!nodeSet.has(e.src)) throw new Error(`edge src missing node: ${e.src}`);
    if (!nodeSet.has(e.dest))
      throw new Error(`edge dest missing node: ${e.dest}`);
    if (e.variableFee < 0)
      throw new Error(`negative variableFee on ${e.src}->${e.dest}`);
  }
  return net;
};
