import test from 'ava';
import {
  agops,
  agoric,
  bankSend,
  getUser,
  openVault,
  adjustVault,
  closeVault,
  getISTBalance,
  getContractInfo,
  ATOM_DENOM,
  USER1ADDR,
  waitForBlock,
} from '@agoric/synthetic-chain';
import { getBalance } from './test-lib/utils.js';

test.serial('attempt to open vaults under the minimum amount', async t => {
  const activeVaultsBefore = await agops.vaults('list', '--from', USER1ADDR);
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);
  t.log('active vaults before:', activeVaultsBefore);

  const mint = '3.0';
  const collateral = '5.0';
  const error = await t.throwsAsync(() =>
    openVault(USER1ADDR, mint, collateral),
  );

  t.true(
    error?.message.includes(
      'Error: Vault creation requires a minInitialDebt of {"brand":"[Alleged: IST brand]","value":"[5000000n]"}',
    ),
    'Error message does not contain the expected text',
  );

  const activeVaultsAfter = await agops.vaults('list', '--from', USER1ADDR);
  t.log('active vaults after:', activeVaultsAfter);

  t.true(
    activeVaultsAfter.length === activeVaultsBefore.length,
    'The number of active vaults should remain the same.',
  );
});

test.serial('open new vault', async t => {
  const istBalanceBefore = await getISTBalance(USER1ADDR);
  const activeVaultsBefore = await agops.vaults('list', '--from', USER1ADDR);
  t.log('uist balance before:', istBalanceBefore);
  t.log('active vaults before:', activeVaultsBefore);

  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);

  const mint = '5.0';
  const collateral = '10.0';
  await openVault(USER1ADDR, mint, collateral);

  const istBalanceAfter = await getISTBalance(USER1ADDR);
  const activeVaultsAfter = await agops.vaults('list', '--from', USER1ADDR);
  t.log('uist balance after:', istBalanceAfter);
  t.log('active vaults after:', activeVaultsAfter);

  t.is(
    istBalanceBefore + 5,
    istBalanceAfter,
    'The IST balance should increase by the minted amount',
  );
  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length + 1,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('remove collateral', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const collateralBefore = vaultData.locked.value;
  t.log('vault collateral before:', collateralBefore);

  await adjustVault(USER1ADDR, vaultID, { wantCollateral: 1.0 });
  await waitForBlock();

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });

  const collateralAfter = vaultData.locked.value;
  t.log('vault collateral after:', collateralAfter);

  t.is(
    Number(collateralBefore),
    Number(collateralAfter) + 1000000,
    'The vault Collateral should decrease after removing some ATOM',
  );
});

test.serial('remove IST', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const debtBefore = vaultData.debtSnapshot.debt.value;
  t.log('vault debt before:', debtBefore);

  await adjustVault(USER1ADDR, vaultID, { wantMinted: 1.0 });
  await waitForBlock();

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const debtAfter = vaultData.debtSnapshot.debt.value;
  t.log('vault debt after:', debtAfter);

  t.is(
    Number(debtAfter),
    Number(debtBefore) + 1005000,
    'The vault Debt should increase after removing some IST',
  );
});

test.serial('close vault', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const vaultCollateral = vaultData.locked.value;
  t.log('vault collateral:', vaultCollateral);

  const atomBalanceBefore = await getBalance([USER1ADDR], ATOM_DENOM);
  t.log('atom balance before', atomBalanceBefore);

  await closeVault(USER1ADDR, vaultID, 6.03);
  await waitForBlock();

  const atomBalanceAfter = await getBalance([USER1ADDR], ATOM_DENOM);
  t.log('atom balance after', atomBalanceAfter);

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const vaultState = vaultData.vaultState;
  t.log('vault state:', vaultState);

  t.is(
    atomBalanceAfter,
    atomBalanceBefore + Number(vaultCollateral),
    'The ATOM balance should increase by the vault collateral amount',
  );
  t.is(vaultState, 'closed', 'The vault should be in the "closed" state.');
});

test.serial('open second vault', async t => {
  const user2Address = await getUser('user2');
  await bankSend(user2Address, `20000000${ATOM_DENOM}`);

  const activeVaultsBefore = await agops.vaults('list', '--from', user2Address);
  t.log('active vaults before:', activeVaultsBefore);

  const mint = '7.0';
  const collateral = '11.0';
  await openVault(user2Address, mint, collateral);
  await waitForBlock();

  const activeVaultsAfter = await agops.vaults('list', '--from', user2Address);
  t.log('active vaults after:', activeVaultsAfter);

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length + 1,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('add collateral', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const collateralBefore = vaultData.locked.value;
  t.log('vault collateral before:', collateralBefore);

  await adjustVault(user2Address, vaultID, { giveCollateral: 1.0 });
  await waitForBlock();

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const collateralAfter = vaultData.locked.value;
  t.log('vault collateral after:', collateralAfter);

  t.is(
    Number(collateralBefore),
    Number(collateralAfter) - 1000000,
    'The vault Collateral should increase after adding some ATOM',
  );
});

test.serial('add IST', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const debtBefore = vaultData.debtSnapshot.debt.value;
  t.log('vault debt before:', debtBefore);

  await adjustVault(user2Address, vaultID, { giveMinted: 1.0 });
  await waitForBlock();

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const debtAfter = vaultData.debtSnapshot.debt.value;
  t.log('vault debt after:', debtAfter);

  t.is(
    Number(debtAfter),
    Number(debtBefore) - 1000000,
    'The vault Debt should decrease after adding some IST',
  );
});

test.serial('close second vault', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const vaultCollateral = vaultData.locked.value;
  t.log('vault collateral:', vaultCollateral);

  const atomBalanceBefore = await getBalance([user2Address], ATOM_DENOM);
  t.log('atom balance before', atomBalanceBefore);

  await closeVault(user2Address, vaultID, 6.035);
  await waitForBlock();

  const atomBalanceAfter = await getBalance([user2Address], ATOM_DENOM);
  t.log('atom balance after', atomBalanceAfter);

  vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  const vaultState = vaultData.vaultState;
  t.log('vault state:', vaultState);

  t.is(
    atomBalanceAfter,
    atomBalanceBefore + Number(vaultCollateral),
    'The ATOM balance should increase by the vault collateral amount',
  );
  t.is(vaultState, 'closed', 'The vault should be in the "closed" state.');
});
