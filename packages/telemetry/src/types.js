/**
 * @typedef {Partial<{
 *  'block.height': Slog['blockHeight'];
 *  'block.time': Slog['blockTime'];
 *  'crank.deliveryNum': Slog['deliveryNum'];
 *  'crank.num': Slog['crankNum'];
 *  'crank.type': Slog['crankType'];
 *  'crank.vatID': Slog['vatID'];
 *  init: boolean;
 *  replay: boolean;
 *  'run.id': string;
 *  'run.num': string | null;
 *  'run.trigger.blockHeight': Slog['blockHeight'];
 *  'run.trigger.msgIdx': number;
 *  'run.trigger.sender': Slog['sender'];
 *  'run.trigger.source': Slog['source'];
 *  'run.trigger.bundleHash': Slog['endoZipBase64Sha512'];
 *  'run.trigger.time': Slog['blockTime'];
 *  'run.trigger.txHash': string;
 *  'run.trigger.type': string;
 *  }>
 * } Context
 *
 * @typedef {{
 *  Forced: "forced";
 *  Priority: "priority";
 *  Inbound: "inbound";
 * }} InboundQueueName
 *
 * @typedef {{
 *  'crank.syscallNum'?: Slog['syscallNum'];
 *  'process.uptime': Slog['monotime'];
 * } & Context} LogAttributes
 *
 * @typedef {{
 *  afterCommitHangoverSeconds: number;
 *  archiveWriteSeconds: number;
 *  blockHeight?: number;
 *  blockLagSeconds: number;
 *  blockTime?: number;
 *  chainTime: number;
 *  compressSeconds: number;
 *  compressedSize: number;
 *  cosmosCommitSeconds: number;
 *  crankNum?: bigint;
 *  crankType?: string;
 *  dbSaveSeconds: number;
 *  deliveryNum?: bigint;
 *  fullSaveTime: number;
 *  inboundNum?: string;
 *  inboundQueueInitialLengths: Record<InboundQueueName[keyof InboundQueueName], number>;
 *  inboundQueueStartLengths: Record<InboundQueueName[keyof InboundQueueName], number>;
 *  interBlockSeconds: number;
 *  messageType: string;
 *  monotime: number;
 *  processedActionCounts: Array<{
 *      count: number;
 *      phase: InboundQueueName;
 *      type: import('@agoric/internal/src/action-types.js').QueuedActionType;
 *  }>;
 *  remainingBeans?: bigint;
 *  replay?: boolean;
 *  runNum?: number;
 *  runSeconds: number;
 *  saveTime: number;
 *  sender?: string;
 *  source?: string;
 *  endoZipBase64Sha512?: string;
 *  seconds: number;
 *  stats: Record<string, number>;
 *  syscallNum?: number;
 *  time: number;
 *  type: string;
 *  uncompressedSize: number;
 *  vatID?: string;
 * }} Slog
 */

export {};
