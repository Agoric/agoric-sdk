import test from 'ava';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import transfer from '@agoric/fast-usdc/src/cli/transfer.js';
import {
  mockOut,
  mockFile,
  makeVstorageMock,
  makeFetchMock,
  makeMockSigner,
} from '../../testing/mocks.js';
import { settlementAddress } from '@agoric/fast-usdc/src/fixtures.js';

test('Errors if config missing', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const out = mockOut();
  const file = mockFile(path);

  // @ts-expect-error mocking partial Console
  await t.throwsAsync(transfer.transfer(file, '1500000', 'noble1234', out));

  t.is(
    out.getErrOut(),
    `No config found at ${path}. Use "config init" to create one, or "--home" to specify config location.\n`,
  );
  t.is(out.getLogOut(), '');
});

const makeMockEthProvider = () => {
  const txnArgs: any[] = [];
  const provider = {
    getTransactionCount: () => {},
    estimateGas: () => {},
    getNetwork: () => ({ chainId: 123 }),
    getFeeData: () => ({ gasPrice: 1 }),
    broadcastTransaction: (...args) => {
      txnArgs.push(args);
      return {
        blockNumber: 9000,
      };
    },
    getTransactionReceipt: () => ({
      blockNumber: 9000,
      hash: 'SUCCESSHASH',
      confirmations: () => [9000],
      logs: [],
    }),
  };

  return { provider, getTxnArgs: () => harden([...txnArgs]) };
};

test('Transfer registers the noble forwarding account if it does not exist', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const nobleApi = 'http://api.noble.test';
  const nobleToAgoricChannel = 'channel-test-7';
  const destinationChainApi = 'http://api.dydx.fake-test';
  const destinationUSDCDenom = 'ibc/USDCDENOM';
  const config = {
    agoricRpc: 'http://rpc.agoric.test',
    nobleApi,
    nobleToAgoricChannel,
    nobleSeed: 'test noble seed',
    ethRpc: 'http://rpc.eth.test',
    ethSeed: 'a4b7f431465df5dc1458cd8a9be10c42da8e3729e3ce53f18814f48ae2a98a08',
    tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    destinationChains: [
      {
        bech32Prefix: 'dydx',
        api: destinationChainApi,
        USDCDenom: destinationUSDCDenom,
      },
    ],
  };
  const out = mockOut();
  const file = mockFile(path, JSON.stringify(config));
  const agoricSettlementAccount = settlementAddress.value;
  const settlementAccountVstoragePath = 'published.fastUsdc.settlementAccount';
  const vstorageMock = makeVstorageMock({
    [settlementAccountVstoragePath]: agoricSettlementAccount,
  });
  const amount = '150';
  const EUD = 'dydx1234';
  const nobleFwdAccountQuery = `${nobleApi}/noble/forwarding/v1/address/${nobleToAgoricChannel}/${encodeAddressHook(
    agoricSettlementAccount,
    { EUD },
  )}/`;
  const destinationBankQuery = `${destinationChainApi}/cosmos/bank/v1beta1/balances/${EUD}`;
  let balanceQueryCount = 0;
  const fetchMock = makeFetchMock((query: string) => {
    if (query === nobleFwdAccountQuery) {
      return {
        address: 'noble14lwerrcfzkzrv626w49pkzgna4dtga8c5x479h',
        exists: false,
      };
    }
    if (query === destinationBankQuery) {
      if (balanceQueryCount > 1) {
        return {
          balances: [{ denom: destinationUSDCDenom, amount }],
        };
      } else {
        balanceQueryCount += 1;
        return {};
      }
    }
  });
  const nobleSignerAddress = 'noble09876';
  const signerMock = makeMockSigner();
  const mockEthProvider = makeMockEthProvider();

  await transfer.transfer(
    file,
    amount,
    EUD,
    // @ts-expect-error mocking console
    out,
    fetchMock.fetch,
    vstorageMock.vstorage,
    { signer: signerMock.signer, address: nobleSignerAddress },
    mockEthProvider.provider,
  );
  t.is(vstorageMock.getQueryCounts()[settlementAccountVstoragePath], 1);
  t.is(fetchMock.getQueryCounts()[nobleFwdAccountQuery], 1);
  t.snapshot(signerMock.getSigned());
});

test('Transfer signs and broadcasts the depositForBurn message on Ethereum', async t => {
  const path = 'config/dir/.fast-usdc/config.json';
  const nobleApi = 'http://api.noble.test';
  const nobleToAgoricChannel = 'channel-test-7';
  const destinationChainApi = 'http://api.dydx.fake-test';
  const destinationUSDCDenom = 'ibc/USDCDENOM';
  const config = {
    agoricRpc: 'http://rpc.agoric.test',
    nobleApi,
    nobleToAgoricChannel,
    nobleSeed: 'test noble seed',
    ethRpc: 'http://rpc.eth.test',
    ethSeed: 'a4b7f431465df5dc1458cd8a9be10c42da8e3729e3ce53f18814f48ae2a98a08',
    tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    destinationChains: [
      {
        bech32Prefix: 'dydx',
        api: destinationChainApi,
        USDCDenom: destinationUSDCDenom,
      },
    ],
  };
  const out = mockOut();
  const file = mockFile(path, JSON.stringify(config));
  const agoricSettlementAccount = settlementAddress.value;
  const settlementAccountVstoragePath = 'published.fastUsdc.settlementAccount';
  const vstorageMock = makeVstorageMock({
    [settlementAccountVstoragePath]: agoricSettlementAccount,
  });
  const amount = '150';
  const EUD = 'dydx1234';
  const nobleFwdAccountQuery = `${nobleApi}/noble/forwarding/v1/address/${nobleToAgoricChannel}/${encodeAddressHook(
    agoricSettlementAccount,
    { EUD },
  )}/`;
  const destinationBankQuery = `${destinationChainApi}/cosmos/bank/v1beta1/balances/${EUD}`;
  let balanceQueryCount = 0;
  const fetchMock = makeFetchMock((query: string) => {
    if (query === nobleFwdAccountQuery) {
      return {
        address: 'noble14lwerrcfzkzrv626w49pkzgna4dtga8c5x479h',
        exists: true,
      };
    }
    if (query === destinationBankQuery) {
      if (balanceQueryCount > 1) {
        return {
          balances: [{ denom: destinationUSDCDenom, amount }],
        };
      } else {
        balanceQueryCount += 1;
        return {};
      }
    }
  });
  const nobleSignerAddress = 'noble09876';
  const signerMock = makeMockSigner();
  const mockEthProvider = makeMockEthProvider();

  await transfer.transfer(
    file,
    amount,
    EUD,
    // @ts-expect-error mocking console
    out,
    fetchMock.fetch,
    vstorageMock.vstorage,
    { signer: signerMock.signer, address: nobleSignerAddress },
    mockEthProvider.provider,
    {},
  );

  t.is(signerMock.getSigned(), undefined);
  t.deepEqual(mockEthProvider.getTxnArgs()[0], [
    '0xf8a4800180941c7d4b196cb0c7b01d743fbc6116a902379c723880b844095ea7b30000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa50000000000000000000000000000000000000000000000000000000008f0d18082011aa0b2d87eeb1cb36243f95662739e2a7bd4bddc2b8afe189ac4848ec71cc314335ba068136695c644f69474e2e30ea7059f9b380fbb1a09beb3580f73d3ea349912ab',
  ]);
  // Can be decoded using a tool like https://rawtxdecode.in/ and an ABI https://github.com/circlefin/evm-cctp-contracts/blob/e4e6e2fccd6820002eb4a5b4fabdc8ea11031ad9/docs/abis/cctp/TokenMessenger.json
  t.deepEqual(mockEthProvider.getTxnArgs()[1], [
    '0xf8e4800180949f3b8679c73c2fef8b59b4f3444d4e156fb70aa580b8846fd3504e0000000000000000000000000000000000000000000000000000000008f0d1800000000000000000000000000000000000000000000000000000000000000004000000000000000000000000afdd918f09158436695a754a1b0913ed5ab474f80000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c723882011aa09fc97790b2ba23fbb974554dbcee00df1a1f50e9fec4fdf370454773604aa477a038a1d86afc2a7afdc78088878a912f1a7c678b10c3120d308f8260a277b135a3',
  ]);
  t.is(fetchMock.getQueryCounts()[destinationBankQuery], 3);
});
