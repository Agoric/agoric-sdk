import test from 'ava';
import {
  agops,
  bankSend,
  getUser,
  openVault,
  adjustVault,
  closeVault,
  getISTBalance,
  queryVstorage,
  ATOM_DENOM,
  USER1ADDR,
  waitForBlock,
} from '@agoric/synthetic-chain';

const getFormattedVaultData = vaultData => {
  const { values } = JSON.parse(vaultData.value);
  const { body } = JSON.parse(values[0]);
  const cleanedBody = JSON.parse(body.slice(1));
  return cleanedBody;
};

test.serial('attempt to open vaults under the minimum amount', async t => {
  const activeVaultsBefore = await agops.vaults('list', '--from', USER1ADDR);
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);

  const governancePath = 'published.vaultFactory.governance';
  const governanceDataString = await queryVstorage(governancePath);
  const governanceData = getFormattedVaultData(governanceDataString);
  const minInitialDebt = governanceData.current.MinInitialDebt.value.value;
  const minInitialDebtNumber = Number(minInitialDebt) / Math.pow(10, 6);

  const mint = (minInitialDebtNumber - 1.0).toString();
  const collateral = '5.0';
  await t.throwsAsync(() => openVault(USER1ADDR, mint, collateral));

  const activeVaultsAfter = await agops.vaults('list', '--from', USER1ADDR);

  t.true(
    activeVaultsAfter.length === activeVaultsBefore.length,
    'The number of active vaults should remain the same.',
  );
});

test.serial('open new vault', async t => {
  const istBalanceBefore = await getISTBalance(USER1ADDR);
  const activeVaultsBefore = await agops.vaults('list', '--from', USER1ADDR);

  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);

  const mint = '5.0';
  const collateral = '10.0';
  await openVault(USER1ADDR, mint, collateral);
  await waitForBlock();

  const istBalanceAfter = await getISTBalance(USER1ADDR);
  const activeVaultsAfter = await agops.vaults('list', '--from', USER1ADDR);

  t.true(
    istBalanceBefore + 5 === istBalanceAfter,
    'The IST balance should increase by the minted amount',
  );
  t.true(
    activeVaultsAfter.length > activeVaultsBefore.length,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('remove collateral', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultDataString = await queryVstorage(vaultPath);
  let vaultData = getFormattedVaultData(vaultDataString);
  const collateralBefore = vaultData.locked.value;

  await adjustVault(USER1ADDR, vaultID, { wantCollateral: 1.0 });
  await waitForBlock();

  vaultDataString = await queryVstorage(vaultPath);
  vaultData = getFormattedVaultData(vaultDataString);
  const collateralAfter = vaultData.locked.value;

  t.true(
    Number(collateralBefore) > Number(collateralAfter),
    'The vault Collateral should decrease after removing some ATOM',
  );
});

test.serial('remove IST', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultDataString = await queryVstorage(vaultPath);
  let vaultData = getFormattedVaultData(vaultDataString);
  const debtBefore = vaultData.debtSnapshot.debt.value;

  await adjustVault(USER1ADDR, vaultID, { wantMinted: 1.0 });
  await waitForBlock();

  vaultDataString = await queryVstorage(vaultPath);
  vaultData = getFormattedVaultData(vaultDataString);
  const debtAfter = vaultData.debtSnapshot.debt.value;

  t.true(
    Number(debtAfter) > Number(debtBefore),
    'The vault Debt should increase after removing some IST',
  );
});

test.serial('close vault', async t => {
  const activeVaults = await agops.vaults('list', '--from', USER1ADDR);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  await closeVault(USER1ADDR, vaultID, 6.03);
  await waitForBlock();

  const vaultDataString = await queryVstorage(vaultPath);
  const vaultData = getFormattedVaultData(vaultDataString);
  const vaultState = vaultData.vaultState;

  t.is(vaultState, 'closed', 'The vault should be in the "closed" state.');
});

test.serial('open second vault', async t => {
  const user2Address = await getUser('user2');
  await bankSend(user2Address, `20000000${ATOM_DENOM}`);

  const activeVaultsBefore = await agops.vaults('list', '--from', user2Address);

  const mint = '7.0';
  const collateral = '11.0';
  await openVault(user2Address, mint, collateral);
  await waitForBlock();

  const activeVaultsAfter = await agops.vaults('list', '--from', user2Address);

  t.true(
    activeVaultsAfter.length > activeVaultsBefore.length,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('add collateral', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultDataString = await queryVstorage(vaultPath);
  let vaultData = getFormattedVaultData(vaultDataString);
  const collateralBefore = vaultData.locked.value;

  await adjustVault(user2Address, vaultID, { giveCollateral: 1.0 });
  await waitForBlock();

  vaultDataString = await queryVstorage(vaultPath);
  vaultData = getFormattedVaultData(vaultDataString);
  const collateralAfter = vaultData.locked.value;

  t.true(
    Number(collateralBefore) < Number(collateralAfter),
    'The vault Collateral should increase after adding some ATOM',
  );
});

test.serial('add IST', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  let vaultDataString = await queryVstorage(vaultPath);
  let vaultData = getFormattedVaultData(vaultDataString);
  const debtBefore = vaultData.debtSnapshot.debt.value;

  await adjustVault(user2Address, vaultID, { giveMinted: 1.0 });
  await waitForBlock();

  vaultDataString = await queryVstorage(vaultPath);
  vaultData = getFormattedVaultData(vaultDataString);
  const debtAfter = vaultData.debtSnapshot.debt.value;

  t.true(
    Number(debtAfter) < Number(debtBefore),
    'The vault Debt should decrease after adding some IST',
  );
});

test.serial('close second vault', async t => {
  const user2Address = await getUser('user2');
  const activeVaults = await agops.vaults('list', '--from', user2Address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  await closeVault(user2Address, vaultID, 6.035);
  await waitForBlock();

  const vaultDataString = await queryVstorage(vaultPath);
  const vaultData = getFormattedVaultData(vaultDataString);
  const vaultState = vaultData.vaultState;

  t.is(vaultState, 'closed', 'The vault should be in the "closed" state.');
});
