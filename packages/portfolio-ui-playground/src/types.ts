export interface TargetAllocation {
  poolKey: string;
  basisPoints: number; // out of 10000
}

export interface InvitationSpec {
  source: 'agoricContract';
  instancePath: string[];
  callPipe: string; // JSON stringified array of [method, args] tuples
}

export interface Proposal {
  give?: Record<string, { brand: string; value: string }>;
  want?: Record<string, { brand: string; value: string }>;
}

export interface OfferSpec {
  id: string;
  invitationSpec: InvitationSpec;
  proposal: Proposal;
  offerArgs?: {
    targetAllocation?: Record<string, string>; // LegibleCapData bigints as "+5000"
  };
}

export interface BridgeAction {
  method: 'executeOffer';
  offer: OfferSpec;
  user: string; // EVM address for signature
  nonce: number; // timestamp for signature
  deadline: number; // timestamp + 1 hour for signature
}

export interface EIP712Domain {
  name: string;
  version: string;
}

export interface EIP712Types {
  BridgeAction: Array<{ name: string; type: string }>;
  OfferSpec: Array<{ name: string; type: string }>;
  InvitationSpec: Array<{ name: string; type: string }>;
  Proposal: Array<{ name: string; type: string }>;
  OfferArgs: Array<{ name: string; type: string }>;
}
