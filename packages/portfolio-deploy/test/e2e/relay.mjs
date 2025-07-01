import {
  defaultAxelarChainInfo,
  AxelarRelayerService,
} from './agoric-to-axelar-local/packages/axelar-local-dev-cosmos/dist/index.js';
import {
  evmRelayer,
  createNetwork,
  deployContract,
  relay,
  RelayerType,
} from './agoric-to-axelar-local/packages/axelar-local-dev/dist/index.js';
import { ethers } from 'ethers';
import MockAave from './agoric-to-axelar-local/packages/axelar-local-dev-cosmos/artifacts/src/__tests__/contracts/MockAave.sol/MockAave.json' assert { type: 'json' };
import Factory from './agoric-to-axelar-local/packages/axelar-local-dev-cosmos/artifacts/src/__tests__/contracts/Factory.sol/Factory.json' assert { type: 'json' };

export const relayBasic = async () => {
  const axelarRelayer = await AxelarRelayerService.create(
    defaultAxelarChainInfo,
  );

  const ethereumNetwork = await createNetwork({ name: 'Ethereum' });
  const USDC = await ethereumNetwork.deployToken(
    'USDC',
    'aUSDC',
    6,
    BigInt(100_000e6),
  );

  const mockAaveContract = await deployContract(
    ethereumNetwork.userWallets[0],
    MockAave,
    [USDC.address],
  );
  console.log('MockAave Contract Address:', mockAaveContract.address);

  const factoryContract = await deployContract(
    ethereumNetwork.userWallets[0],
    Factory,
    [
      ethereumNetwork.gateway.address,
      ethereumNetwork.gasService.address,
      'Ethereum',
    ],
  );
  console.log('Factory Contract Address:', factoryContract.address);

  const sendNativeTokensToFactory = async (fromWallet, toContract, amount) => {
    const tx = await fromWallet.sendTransaction({
      to: toContract.address,
      value: amount,
    });
    await tx.wait();
    console.log(
      `Sent ${ethers.formatEther(amount)} native tokens to ${toContract.address}`,
    );
  };
  const nativeAmountToSend = ethers.parseEther('1.0'); // Sending 1 native token
  await sendNativeTokensToFactory(
    ethereumNetwork.userWallets[0],
    factoryContract,
    nativeAmountToSend,
  );

  const factoryBalance = await ethereumNetwork.provider.getBalance(
    factoryContract.address,
  );
  console.log(`Factory Contract ETH Balance: ${factoryBalance} ETH`);
  evmRelayer.setRelayer(RelayerType.Agoric, axelarRelayer);

  while (true) {
    // Predicted remote account address
    const remoteAccountAddress = '0xd8E896691A0FCE4641D44d9E461A6d746A5c91dB';
    const mintAmount = ethers.parseUnits('1', 6);
    await ethereumNetwork.giveToken(remoteAccountAddress, 'aUSDC', mintAmount);
    console.log(`Minted ${mintAmount} tokens to ${remoteAccountAddress}`);

    await relay({
      agoric: axelarRelayer,
      evm: evmRelayer,
    });
  }
};

await relayBasic();
