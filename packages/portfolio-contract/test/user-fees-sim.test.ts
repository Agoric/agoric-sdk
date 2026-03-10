/**
 * @file Simulation test for the 80.3 user-fees sequence diagrams.
 *
 * Each diagram arrow is represented as a method call on the receiving object.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { ExecutionContext as Ex } from 'ava';
import type { AbiParametersToPrimitiveTypes, Address } from 'abitype';
import { PermitWitnessTransferFromFunctionABIType } from '@agoric/orchestration/src/utils/permit2/signatureTransferHelpers.js';
import type { FlowDetail } from '@agoric/portfolio-api';
import type { YmaxPermitWitnessTransferFromData } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem-utils/types.js';
import { assert, Fail } from '@endo/errors';
import type { Abi } from 'viem';
import { objectMap } from '@endo/patterns';
import { erc20ABI } from '../src/interfaces/erc20.ts';
import type { AbiContract } from '../src/evm-facade.ts';

// #region EVM Platform types
type ERC20Contract = AbiContract<typeof erc20ABI>;
type TransferEvent = AbiParametersToPrimitiveTypes<
  Extract<
    (typeof erc20ABI)[number],
    { type: 'event'; name: 'Transfer' }
  >['inputs']
>;
type Transfer = {
  from: TransferEvent[0];
  to: TransferEvent[1];
  value: TransferEvent[2];
};
type UnsignedMessage = YmaxPermitWitnessTransferFromData<'Withdraw'>;
type SignedMessage = WithSignature<UnsignedMessage>;
// #endregion

// #region Ymax types
// Design note: the real withdraw FlowDetail should grow this fee field.
type QuoteFlowDetail = Extract<FlowDetail, { type: 'withdraw' }>;
type WithdrawFlowDetail = Extract<FlowDetail, { type: 'withdraw' }> & {
  fee: bigint;
};
type ToChain = NonNullable<QuoteFlowDetail['toChain']>;
type QuoteWithdrawFlowDetail = QuoteFlowDetail & { toChain: ToChain };
type WithdrawPlanFlowDetail = WithdrawFlowDetail & { toChain: ToChain };
type PlanStep = (
  | { from?: string; to?: string; fee?: bigint }
  | QuoteFlowDetail
) & {
  userFee?: bigint;
};
type WithdrawArgs = {
  withdrawDetails: {
    portfolio: bigint;
    withdraw: { token: Address; amount: bigint };
  };
  domain: { chainId: bigint };
  spender: Address;
  permit2Payload: PermitDetails['permit2Payload'];
};
type PlanRequest = {
  portfolioId: bigint;
  flowId: bigint;
  portfolioPolicyVersion: bigint;
  rebalanceCount: bigint;
  flowDetail: WithdrawPlanFlowDetail;
};
// #endregion Ymax types

const { freeze } = Object;

const permit2Abi = [PermitWitnessTransferFromFunctionABIType] as const;

const toyHash = (parts: (string | bigint)[]) => `toy:${parts.join('|')}`;
const toyHashWithWitness = ({
  permit,
  spender,
  witness,
  witnessTypeString,
}: {
  permit: PermitDetails['permit2Payload']['permit'];
  spender: Address;
  witness: PermitDetails['permit2Payload']['witness'];
  witnessTypeString: string;
}) =>
  toyHash([
    permit.permitted.token,
    permit.permitted.amount,
    spender,
    permit.nonce,
    permit.deadline,
    witness,
    witnessTypeString,
  ]);

const makeNarrator = () => {
  const arrows: string[] = [];
  const names = new Map<string, string>();
  return freeze({
    reset() {
      arrows.length = 0;
      names.clear();
    },
    name(id: string, label: string) {
      names.set(id, label);
    },
    arrow(from: string, arrow: '->>' | '-->>', to: string, label: string) {
      arrows.push(
        `${names.get(from) ?? from}${arrow}${names.get(to) ?? to}: ${label}`,
      );
    },
    label(id: string) {
      return names.get(id) ?? id;
    },
    lines() {
      return freeze([...arrows]);
    },
  });
};

const narrator = makeNarrator();
const testS = test.serial;

const makeEVM = () => {
  const logs: Transfer[] = [];
  const contracts = new Map<
    Address,
    Record<string, (...args: unknown[]) => unknown>
  >();
  const senderStack: Address[] = [];
  const selfStack: Address[] = [];
  const runAs = <T>(self: Address, sender: Address, thunk: () => T): T => {
    selfStack.push(self);
    senderStack.push(sender);
    try {
      return thunk();
    } finally {
      senderStack.pop();
      selfStack.pop();
    }
  };
  return freeze({
    register<TContract extends Record<string, (...args: unknown[]) => unknown>>(
      contract: TContract,
      address: Address,
    ) {
      !contracts.has(address) ||
        assert.fail(`address already registered ${address}`);
      contracts.set(address, contract);
      return address;
    },
    from(sender: Address) {
      const getContract = <TAbi extends Abi>(address: Address, _abi: TAbi) => {
        const contract =
          contracts.get(address) || assert.fail(`unknown contract ${address}`);
        // a little ugly, but so is msg.sender
        const bound = objectMap(
          contract,
          fn =>
            (...args: unknown[]) =>
              runAs(address, sender, () => fn(...args)),
        );
        return bound as AbiContract<TAbi>;
      };
      return freeze({ getContract });
    },
    msgSender() {
      return senderStack.at(-1) || assert.fail('no msg.sender');
    },
    self() {
      return selfStack.at(-1) || assert.fail('no self');
    },
    emitTransfer(log: Transfer) {
      logs.push(log);
      narrator.arrow(
        log.from,
        '-->>',
        log.to,
        `emit: Transfer{ value: ${log.value} }`,
      );
    },
    getLogs(pred: (log: Transfer) => boolean = () => true) {
      return freeze(logs.filter(pred));
    },
  });
};

const makeERC20 = (
  evm: ReturnType<typeof makeEVM>,
  { symbol = 'USDC', name = 'USD Coin', decimals = 6 } = {},
) => {
  const erc20: ERC20Contract = freeze({
    transferFrom(...[from, to, value]) {
      evm.emitTransfer({ from, to, value });
      return true;
    },
    transfer(...[to, value]) {
      evm.emitTransfer({ from: evm.msgSender(), to, value });
      return true;
    },
    name: () => name,
    symbol: () => symbol,
    decimals: () => decimals,
    totalSupply: () => 0n,
    balanceOf: () => 0n,
    allowance: () => 0n,
    approve: () => assert.fail('not impl'),
  });
  return erc20;
};

type Permit2Contract = AbiContract<typeof permit2Abi>;

const makePermit2 = (evm: ReturnType<typeof makeEVM>) => {
  const permit2: Permit2Contract = {
    permitWitnessTransferFrom(
      permit,
      transferDetails,
      owner,
      witness,
      witnessTypeString,
      signature,
    ) {
      const amount = transferDetails.requestedAmount;
      amount <= permit.permitted.amount ||
        Fail`requestedAmount ${amount} exceeds permitted amount ${permit.permitted.amount}`;
      signature ===
        toyHashWithWitness({
          permit,
          spender: evm.msgSender(),
          witness,
          witnessTypeString,
        }) || Fail`invalid signature for spender ${evm.msgSender()}`;
      narrator.arrow(
        evm.self(),
        '-->>',
        permit.permitted.token,
        `transfer{ from: ${narrator.label(owner)}, to: ${narrator.label(
          transferDetails.to,
        )}, value: ${amount} }`,
      );
      const usdc = evm
        .from(evm.self())
        .getContract(permit.permitted.token, erc20ABI);
      usdc.transferFrom(owner, transferDetails.to, amount);
    },
  };
  return permit2;
};

// Shortcut for the CREATE2-derived wallet address used by the real system.
const walletAddressForPortfolio = (portfolioId: bigint): Address =>
  `0x${portfolioId.toString(16).padStart(40, '0')}` as Address;
const witnessForPortfolio = (portfolioId: bigint): `0x${string}` =>
  `0x${portfolioId.toString(16).padStart(64, '0')}`;

const makeEthereumWallet = (
  evm: ReturnType<typeof makeEVM>,
  contracts: { permit2: Address; feeCollector: Address },
  salt: bigint,
) => {
  const address = walletAddressForPortfolio(salt);
  const wallet = freeze({
    withdrawWithFee(
      _t: Ex,
      {
        withdraw,
        recipient,
        permit2Payload,
      }: {
        withdraw: { token: Address; amount: bigint };
        recipient: Address;
        permit2Payload: PermitDetails['permit2Payload'];
      },
    ) {
      const permit2 = evm
        .from(address)
        .getContract(contracts.permit2, permit2Abi);
      const withdrawToken = evm
        .from(address)
        .getContract(withdraw.token, erc20ABI);
      const permitted = {
        to: contracts.feeCollector,
        requestedAmount: permit2Payload.permit.permitted.amount,
      };
      const { permit, owner, witness, witnessTypeString, signature } =
        permit2Payload;
      narrator.arrow(
        address,
        '-->>',
        contracts.permit2,
        'permitWitnessTransferFrom(...)',
      );
      permit2.permitWitnessTransferFrom(
        permit,
        permitted,
        owner,
        witness,
        witnessTypeString,
        signature,
      );
      narrator.arrow(
        address,
        '-->>',
        withdraw.token,
        `transfer{ to: ${narrator.label(recipient)}, value: ${withdraw.amount} }`,
      );
      withdrawToken.transfer(recipient, withdraw.amount);
    },
  });
  evm.register(
    wallet as Record<string, (...args: unknown[]) => unknown>,
    address,
  );
  return wallet;
};

const sum = (values: bigint[]) =>
  values.reduce((total, value) => total + value, 0n);
const sumUserFees = (plan: PlanStep[]) =>
  sum(plan.map(step => step.userFee ?? 0n));
const formatUSDC = (value: bigint) => (Number(value) / 1_000_000).toFixed(2);
const isChargeableStep = (
  step: PlanStep,
): step is Extract<PlanStep, { from?: string; to?: string; fee?: bigint }> & {
  from: '@Ethereum';
  to: '-Ethereum';
  fee: bigint;
  userFee: bigint;
} =>
  'from' in step &&
  step.from === '@Ethereum' &&
  'fee' in step &&
  typeof step.fee === 'bigint' &&
  'to' in step &&
  step.to === '-Ethereum' &&
  'userFee' in step &&
  typeof step.userFee === 'bigint';

const plannerAlgorithm = (
  flowDetail: QuoteWithdrawFlowDetail,
  actor = 'yds',
): PlanStep[] => {
  flowDetail.amount.value === 3_000_000n ||
    Fail`unsupported amount ${flowDetail.amount.value}`;
  const gasLimit = 279_473n;
  const quote = 370_132n;
  narrator.arrow(
    actor,
    '-->>',
    actor,
    'previewPlan = run planner-algorithm in preview mode',
  );
  narrator.arrow(
    actor,
    '-->>',
    'axelar',
    `estimateGasFee({ destinationChain: ${flowDetail.toChain}, gasLimit: ${gasLimit}, sourceTokenSymbol: uusdc, ... })`,
  );
  narrator.arrow('axelar', '-->>', actor, `${quote}uusdc`);
  return [
    { from: '@noble', to: '@Ethereum' },
    {
      from: '@Ethereum',
      to: '-Ethereum',
      fee: 109_496_306n,
      userFee: 444_159n,
    },
    flowDetail,
  ];
};

const makePlanner = () =>
  freeze({
    async plan(
      _t: Ex,
      {
        portfolioId,
        flowId,
        portfolioPolicyVersion,
        rebalanceCount,
        flowDetail,
      }: PlanRequest,
    ) {
      const plan = plannerAlgorithm(flowDetail, 'ypr');
      const chargeableStep =
        plan.find(isChargeableStep) || Fail`missing chargeable step`;
      narrator.arrow(
        'ypr',
        '-->>',
        'ypr',
        `plan = [ ..., { from: @Ethereum, fee: ${chargeableStep.fee}uBLD, userFee: ${chargeableStep.userFee}uusdc }, ... ] = run planner-algorithm`,
      );
      narrator.arrow(
        'ypr',
        '-->>',
        'portfolio',
        `resolvePlan(${portfolioId}, ${flowId}, plan, ${portfolioPolicyVersion}, ${rebalanceCount})`,
      );
      return plan;
    },
  });

const makeVStorage = () => {
  const portfolioIdByOwner = new Map<Address, bigint>();
  const writeFacet = freeze({
    publishPortfolio(owner: Address, portfolioId: bigint) {
      portfolioIdByOwner.set(owner, portfolioId);
    },
  });
  const readFacet = freeze({
    getPortfolioId(owner: Address) {
      return portfolioIdByOwner.get(owner);
    },
  });
  return freeze({ writeFacet, readFacet });
};

const makePortfolio = (
  planner: ReturnType<typeof makePlanner>,
  evm: ReturnType<typeof makeEVM>,
  contractAddresses: { permit2: Address; feeCollector: Address },
  owner: Address,
  portfolioId: bigint,
) => {
  const accounts = {
    Ethereum: makeEthereumWallet(evm, contractAddresses, portfolioId),
  };
  const flowId = 3n;
  const portfolioPolicyVersion = 2n;
  const rebalanceCount = 1n;
  return freeze({
    getPortfolioId() {
      return portfolioId;
    },
    async withdraw(
      t: Ex,
      {
        withdrawDetails,
        domain,
        spender: _spender,
        permit2Payload,
      }: WithdrawArgs,
    ) {
      const chainId = domain.chainId;
      chainId === 1n || Fail`unsupported chainId ${chainId}`;
      const toChain = 'Ethereum';
      const flowDetail: WithdrawPlanFlowDetail = {
        type: 'withdraw',
        amount: {
          brand: 'USDC' as never,
          value: withdrawDetails.withdraw.amount,
        },
        fee: permit2Payload.permit.permitted.amount,
        toChain,
      };
      narrator.arrow(
        'portfolio',
        '-->>',
        'portfolio',
        `chainId = domain.chainId; toChain = chainIdToAxelarChain(chainId); flowDetail = { type: withdraw, amount: ${withdrawDetails.withdraw.amount}USDC, fee: ${permit2Payload.permit.permitted.amount}uusdc, toChain }`,
      );
      narrator.arrow('portfolio', '-->>', 'ypr', 'plan(flowDetail)');
      // XXX The planner could/should reject the request itself if flowDetail.fee
      // is insufficient, rather than always returning a plan and leaving the
      // contract to reject it afterward.
      const plan = await planner.plan(t, {
        portfolioId,
        flowId,
        portfolioPolicyVersion,
        rebalanceCount,
        flowDetail,
      });
      const userFee = sumUserFees(plan);
      narrator.arrow(
        'portfolio',
        '-->>',
        'portfolio',
        'assert(permit2Payload.permit.amount >= userFee(plan))',
      );
      permit2Payload.permit.permitted.amount >= userFee ||
        Fail`authorized fee ${permit2Payload.permit.permitted.amount} is less than required user fee ${userFee}`;
      narrator.arrow('portfolio', '-->>', 'orch', 'executePlan(plan)');
      narrator.arrow(
        'orch',
        '-->>',
        '@Ethereum',
        'withdrawWithFee({ withdrawDetails, permit2Payload })',
      );
      return accounts.Ethereum.withdrawWithFee(t, {
        withdraw: withdrawDetails.withdraw,
        recipient: owner,
        permit2Payload,
      });
    },
  });
};

const makePortfolioContract = ({
  planner,
  evm,
  contractAddresses,
  vstorage,
}: {
  planner: ReturnType<typeof makePlanner>;
  evm: ReturnType<typeof makeEVM>;
  contractAddresses: { permit2: Address; feeCollector: Address };
  vstorage: ReturnType<typeof makeVStorage>['writeFacet'];
}) => {
  let nextPortfolioId = 80n;
  const portfolios = new Map<bigint, ReturnType<typeof makePortfolio>>();
  const emh = freeze({
    async withdraw(
      t: Ex,
      { withdrawDetails, domain, spender, permit2Payload }: WithdrawArgs,
    ) {
      const portfolio = portfolios.get(withdrawDetails.portfolio);
      if (!portfolio) {
        throw Fail`unknown portfolio ${withdrawDetails.portfolio}`;
      }
      return portfolio.withdraw(t, {
        withdrawDetails,
        domain,
        spender,
        permit2Payload,
      });
    },
  });
  const publicFacet = freeze({
    openPortfolio(owner: Address) {
      const portfolioId = nextPortfolioId;
      nextPortfolioId += 1n;
      const portfolio = makePortfolio(
        planner,
        evm,
        contractAddresses,
        owner,
        portfolioId,
      );
      portfolios.set(portfolioId, portfolio);
      vstorage.publishPortfolio(owner, portfolioId);
      return portfolio;
    },
  });
  const creatorFacet = freeze({
    getEMH() {
      return emh;
    },
  });
  return freeze({ publicFacet, creatorFacet });
};

type EMH = ReturnType<
  ReturnType<typeof makePortfolioContract>['creatorFacet']['getEMH']
>;
type PublicFacet = ReturnType<typeof makePortfolioContract>['publicFacet'];

const makeYDS = (vstorage: ReturnType<typeof makeVStorage>['readFacet']) =>
  freeze({
    async quoteWithdraw({
      owner,
      amount,
      toChain,
    }: {
      owner: Address;
      amount: bigint;
      toChain: ToChain;
    }) {
      const portfolioId = vstorage.getPortfolioId(owner);
      portfolioId || Fail`no portfolio for ${owner}`;
      const plan = plannerAlgorithm(
        {
          type: 'withdraw',
          amount: { brand: 'USDC' as never, value: amount },
          toChain,
        },
        'yds',
      );
      const total = sumUserFees(plan);
      narrator.arrow('yds', '-->>', 'ui', `{ denom: USDC, value: ${total} }`);
      return total;
    },
  });

const makeEMS = (publicFacet: PublicFacet, emh: EMH) =>
  freeze({
    async createPortfolio(_t: Ex, owner: Address) {
      const portfolio = publicFacet.openPortfolio(owner);
      return portfolio.getPortfolioId();
    },
    async handleMessage(t: Ex, owner: Address, signedMessage: SignedMessage) {
      // XXX Sim limitation: real EMS recovers the signer from signedMessage.
      // This sim keeps owner explicit so it can stay focused on the fee flow.
      narrator.arrow('ems', '-->>', 'ems', 'validatePermit2(signedMessage)');
      narrator.arrow('ems', '-->>', 'emh', 'handleMessage(signedMessage)');
      narrator.arrow(
        'emh',
        '-->>',
        'emh',
        `withdrawDetails = { portfolio: ${signedMessage.message.ymaxWithdraw.portfolio}, withdraw: { token: USDC, amount: ${signedMessage.message.ymaxWithdraw.withdraw.amount} } }`,
      );
      narrator.arrow(
        'emh',
        '-->>',
        'emh',
        `domain = { chainId: ${signedMessage.domain!.chainId}, ... }; permit2Payload = { permit.amount: ${signedMessage.message.permitted.amount}, signature, ... }`,
      );
      narrator.arrow(
        'emh',
        '-->>',
        'portfolio',
        'withdraw({ withdrawDetails, domain, permit2Payload })',
      );
      return emh.withdraw(t, {
        withdrawDetails: signedMessage.message.ymaxWithdraw,
        domain: signedMessage.domain!,
        spender: signedMessage.message.spender,
        permit2Payload: {
          owner,
          permit: {
            permitted: signedMessage.message.permitted,
            nonce: signedMessage.message.nonce,
            deadline: signedMessage.message.deadline,
          },
          witness: witnessForPortfolio(
            signedMessage.message.ymaxWithdraw.portfolio,
          ),
          witnessTypeString: 'YmaxWitness',
          signature:
            signedMessage.signature as PermitDetails['permit2Payload']['signature'],
        },
      });
    },
  });

const makeUI = (
  yds: ReturnType<typeof makeYDS>,
  ems: ReturnType<typeof makeEMS>,
) => {
  const networks = freeze({
    Ethereum: {
      chainId: 1n,
      permit2: '0x0000000000000000000000000000000000000002' as Address,
      usdc: '0x0000000000000000000000000000000000000555' as Address,
    },
  });
  return freeze({
    connectWallet(owner: Address) {
      return freeze({
        async createPortfolio(t: Ex) {
          const portfolioId = await ems.createPortfolio(t, owner);
          const makeSignedWithdraw = ({
            amount,
            fee,
            toChain,
          }: {
            amount: bigint;
            fee: bigint;
            toChain: ToChain;
          }): UnsignedMessage => {
            const network =
              toChain === 'Ethereum'
                ? networks.Ethereum
                : Fail`unsupported toChain ${toChain}`;
            narrator.arrow(
              'ui',
              '-->>',
              'ui',
              `domain = { chainId: ${network.chainId}, verifyingContract: ${narrator.label(
                network.permit2,
              )} }; permitted = { token: ${narrator.label(network.usdc)}, amount: ${fee} }`,
            );
            return {
              domain: {
                name: 'Permit2',
                chainId: network.chainId,
                verifyingContract: network.permit2,
              },
              primaryType: 'PermitWitnessTransferFrom',
              types: {} as SignedMessage['types'],
              message: {
                permitted: {
                  token: network.usdc,
                  amount: fee,
                },
                spender: walletAddressForPortfolio(portfolioId),
                nonce: 80n,
                deadline: 1770327683n,
                ymaxWithdraw: {
                  portfolio: portfolioId,
                  withdraw: {
                    token: network.usdc,
                    amount,
                  },
                },
              },
            };
          };
          return freeze({
            quoteWithdraw(args: { amount: bigint; toChain: ToChain }) {
              narrator.arrow(
                'ui',
                '-->>',
                'ui',
                `quoteReq = { type: withdraw, amount: { denom: USDC, value: ${args.amount} }, toChain: ${args.toChain} }`,
              );
              narrator.arrow(
                'ui',
                '->>',
                'yds',
                `quote(${portfolioId}, quoteReq)`,
              );
              return yds.quoteWithdraw({ owner, ...args });
            },
            confirmWithdraw({
              amount,
              fee,
              toChain,
            }: {
              amount: bigint;
              fee: bigint;
              toChain: ToChain;
            }): UnsignedMessage {
              const total = amount + fee;
              narrator.arrow(
                'ui',
                '-->>',
                'user',
                `confirmWithdraw({ amount: ${formatUSDC(amount)} USDC, fee: ${formatUSDC(fee)} USDC, total: ${formatUSDC(total)} USDC })`,
              );
              narrator.arrow(
                'ui',
                '-->>',
                'ui',
                `ymaxWithdraw = { portfolio: ${portfolioId}, withdraw: { token: USDC, amount: ${amount} } }; signedMessage = Permit2Witness({ domain, permitted, ymaxWithdraw }, signature)`,
              );
              return makeSignedWithdraw({ amount, fee, toChain });
            },
            async submitWithdraw(t2: Ex, signedMessage: SignedMessage) {
              narrator.arrow(
                'ui',
                '->>',
                'ems',
                'handleMessage(signedMessage)',
              );
              return ems.handleMessage(t2, owner, signedMessage);
            },
          });
        },
      });
    },
  });
};

const makeUser = (
  eoa = '0x000000000000000000000000000000000000eD12' as Address,
) => {
  return freeze({
    getEOA() {
      return eoa;
    },
    async run(
      t: Ex,
      uiApp: ReturnType<typeof makeUI>,
      args = { amount: 3_000_000n, toChain: 'Ethereum' as ToChain },
    ) {
      const ui = uiApp.connectWallet(eoa);
      const dashboard = await ui.createPortfolio(t);
      narrator.arrow(
        'user',
        '->>',
        'ui',
        `withdraw({ amount: ${formatUSDC(args.amount)} USDC, toChain: ${args.toChain} })`,
      );
      const fee = await dashboard.quoteWithdraw(args);
      narrator.arrow(
        'user',
        '->>',
        'ui',
        `confirmWithdraw({ amount: ${formatUSDC(args.amount)} USDC, fee: ${formatUSDC(fee)} USDC, total: ${formatUSDC(args.amount + fee)} USDC, toChain: ${args.toChain} })`,
      );
      const toSign = dashboard.confirmWithdraw({ ...args, fee });
      const signedMessage: SignedMessage = {
        ...toSign,
        signature: toyHashWithWitness({
          permit: {
            permitted: toSign.message.permitted,
            nonce: toSign.message.nonce,
            deadline: toSign.message.deadline,
          },
          spender: toSign.message.spender,
          witness: witnessForPortfolio(toSign.message.ymaxWithdraw.portfolio),
          witnessTypeString: 'YmaxWitness',
        }) as SignedMessage['signature'],
      };
      return dashboard.submitWithdraw(t, signedMessage);
    },
  });
};

testS('80.3 withdraw collects user fee and withdraws USDC', async t => {
  narrator.reset();
  const ethL1 = makeEVM();
  const addresses = freeze({
    permit2: '0x0000000000000000000000000000000000000002',
    usdc: '0x0000000000000000000000000000000000000555',
    spender: '0x00000000000000000000000000000000000000f1',
    feeCollector: '0x0000000000000000000000000000000000000fee',
  } as const);
  narrator.name(addresses.permit2, 'p2');
  narrator.name(addresses.usdc, 'usdc');
  narrator.name(addresses.feeCollector, 'feeCollector');
  narrator.name(walletAddressForPortfolio(80n), '@Ethereum');

  ethL1.register(makeERC20(ethL1), addresses.usdc);
  const permit2 = ethL1.register(makePermit2(ethL1), addresses.permit2);

  const vstorage = makeVStorage();
  const planner = makePlanner();
  const { publicFacet, creatorFacet } = makePortfolioContract({
    planner,
    evm: ethL1,
    contractAddresses: {
      permit2,
      feeCollector: addresses.feeCollector,
    },
    vstorage: vstorage.writeFacet,
  });
  const yds = makeYDS(vstorage.readFacet);
  const ui = makeUI(yds, makeEMS(publicFacet, creatorFacet.getEMH()));

  const user = makeUser();
  narrator.name(user.getEOA(), '-Ethereum');
  await user.run(t, ui);

  const portfolioId = vstorage.readFacet.getPortfolioId(user.getEOA());
  if (!portfolioId) {
    throw Fail`expected portfolio for ${user.getEOA()}`;
  }
  const atEthereum = walletAddressForPortfolio(portfolioId);

  t.deepEqual(ethL1.getLogs(), [
    { from: user.getEOA(), to: addresses.feeCollector, value: 444_159n },
    {
      from: atEthereum,
      to: user.getEOA(),
      value: 3_000_000n,
    },
  ]);
  t.snapshot(narrator.lines());
});

testS(
  'withdraw fails if signed spender does not match Permit2 caller',
  async t => {
    narrator.reset();
    const ethL1 = makeEVM();
    const addresses = freeze({
      permit2: '0x0000000000000000000000000000000000000002',
      usdc: '0x0000000000000000000000000000000000000555',
      spender: '0x00000000000000000000000000000000000000f1',
      feeCollector: '0x0000000000000000000000000000000000000fee',
    } as const);
    ethL1.register(makeERC20(ethL1), addresses.usdc);
    const permit2 = ethL1.register(makePermit2(ethL1), addresses.permit2);

    const vstorage = makeVStorage();
    const planner = makePlanner();
    const { publicFacet, creatorFacet } = makePortfolioContract({
      planner,
      evm: ethL1,
      contractAddresses: {
        permit2,
        feeCollector: addresses.feeCollector,
      },
      vstorage: vstorage.writeFacet,
    });
    const yds = makeYDS(vstorage.readFacet);
    const ui = makeUI(yds, makeEMS(publicFacet, creatorFacet.getEMH()));

    const user = makeUser();
    const connectedUI = ui.connectWallet(user.getEOA());
    const dashboard = await connectedUI.createPortfolio(t);
    const amount = 3_000_000n;
    const toChain = 'Ethereum' as const;
    const fee = await dashboard.quoteWithdraw({ amount, toChain });
    const toSign = dashboard.confirmWithdraw({ amount, fee, toChain });
    const wrongSpender =
      '0x000000000000000000000000000000000000dead' as Address;
    const signedMessage: SignedMessage = {
      ...toSign,
      signature: toyHashWithWitness({
        permit: {
          permitted: toSign.message.permitted,
          nonce: toSign.message.nonce,
          deadline: toSign.message.deadline,
        },
        spender: wrongSpender,
        witness: witnessForPortfolio(toSign.message.ymaxWithdraw.portfolio),
        witnessTypeString: 'YmaxWitness',
      }) as SignedMessage['signature'],
    };

    await t.throwsAsync(() => dashboard.submitWithdraw(t, signedMessage), {
      message:
        'invalid signature for spender "0x0000000000000000000000000000000000000050"',
    });
    t.deepEqual(ethL1.getLogs(), []);
  },
);
