/* eslint-env node */
import test from 'ava';
import {
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
  GOV1ADDR,
} from '@agoric/synthetic-chain';
import { getBalances, agopsVaults } from './test-lib/utils.js';
import {
  calculateMintFee,
  getAvailableDebtForMint,
  getLastVaultFromAddress,
  getMinInitialDebt,
} from './test-lib/vaults.js';

const VAULT_MANAGER = 'manager0';

test.serial('attempt to open vaults under the minimum amount', async t => {
  const activeVaultsBefore = await agopsVaults(USER1ADDR);
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);
  t.log('active vaults before:', activeVaultsBefore);

  const mint = '3.0';
  const collateral = '5.0';
  await t.throwsAsync(() => openVault(USER1ADDR, mint, collateral), {
    message:
      /Vault creation requires a minInitialDebt of {"brand":"\[Alleged: IST brand\]","value":"\[5000000n\]"}/,
  });

  const activeVaultsAfter = await agopsVaults(USER1ADDR);
  t.log('active vaults after:', activeVaultsAfter);

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length,
    'The number of active vaults should remain the same.',
  );
});

test.serial('open new vault', async t => {
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);

  const istBalanceBefore = await getISTBalance(USER1ADDR);
  const activeVaultsBefore = await agopsVaults(USER1ADDR);
  t.log('uist balance before:', istBalanceBefore);
  t.log('active vaults before:', activeVaultsBefore);

  const mint = '5.0';
  const collateral = '10.0';
  await openVault(USER1ADDR, mint, collateral);

  const istBalanceAfter = await getISTBalance(USER1ADDR);
  const activeVaultsAfter = await agopsVaults(USER1ADDR);
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
  const { vaultID, collateral: collateralBefore } =
    await getLastVaultFromAddress(USER1ADDR);

  t.log('vault collateral before:', collateralBefore);

  await adjustVault(USER1ADDR, vaultID, { wantCollateral: 1.0 });

  const { collateral: collateralAfter } =
    await getLastVaultFromAddress(USER1ADDR);

  t.log('vault collateral after:', collateralAfter);

  t.is(
    collateralBefore,
    collateralAfter + 1_000_000n,
    'The vault Collateral should decrease after removing some ATOM',
  );
});

test.serial('remove IST', async t => {
  const { vaultID, debt: debtBefore } =
    await getLastVaultFromAddress(USER1ADDR);
  t.log('vault debt before:', debtBefore);

  await adjustVault(USER1ADDR, vaultID, { wantMinted: 1.0 });

  const { debt: debtAfter } = await getLastVaultFromAddress(USER1ADDR);
  t.log('vault debt after:', debtAfter);

  t.is(
    debtAfter,
    debtBefore + 1_005_000n,
    'The vault Debt should increase after removing some IST',
  );
});

test.serial('add collateral', async t => {
  const { vaultID, collateral: collateralBefore } =
    await getLastVaultFromAddress(USER1ADDR);
  t.log('vault collateral before:', collateralBefore);

  await adjustVault(USER1ADDR, vaultID, { giveCollateral: 1.0 });

  const { collateral: collateralAfter } =
    await getLastVaultFromAddress(USER1ADDR);
  t.log('vault collateral after:', collateralAfter);

  t.is(
    collateralBefore,
    collateralAfter - 1_000_000n,
    'The vault Collateral should increase after adding some ATOM',
  );
});

test.serial('add IST', async t => {
  const { vaultID, debt: debtBefore } =
    await getLastVaultFromAddress(USER1ADDR);
  t.log('vault debt before:', debtBefore);

  await adjustVault(USER1ADDR, vaultID, { giveMinted: 1.0 });

  const { debt: debtAfter } = await getLastVaultFromAddress(USER1ADDR);
  t.log('vault debt after:', debtAfter);

  t.is(
    debtAfter,
    debtBefore - 1_000_000n,
    'The vault Debt should decrease after adding some IST',
  );
});

test.serial('close vault', async t => {
  const { vaultID, collateral } = await getLastVaultFromAddress(USER1ADDR);
  t.log('vault collateral:', collateral);

  const atomBalanceBefore = await getBalances([USER1ADDR], ATOM_DENOM);
  t.log('atom balance before', atomBalanceBefore);

  await closeVault(USER1ADDR, vaultID, 6.035);

  const atomBalanceAfter = await getBalances([USER1ADDR], ATOM_DENOM);
  t.log('atom balance after', atomBalanceAfter);

  const { state } = await getLastVaultFromAddress(USER1ADDR);
  t.log('vault state:', state);

  t.is(
    atomBalanceAfter,
    atomBalanceBefore + collateral,
    'The ATOM balance should increase by the vault collateral amount',
  );
  t.is(state, 'closed', 'The vault should be in the "closed" state.');
});

test.serial(
  'user cannot open a vault under the minimum initial debt',
  async t => {
    await bankSend(GOV1ADDR, `200000000000000000${ATOM_DENOM}`);
    const activeVaultsBefore = await agopsVaults(GOV1ADDR);
    t.log('active vaults before:', activeVaultsBefore);

    const minInitialDebt = await getMinInitialDebt();

    const mint = minInitialDebt - 1n;
    const collateral = mint * 2n;

    await t.throwsAsync(
      () => openVault(GOV1ADDR, mint.toString(), collateral.toString()),
      {
        message: new RegExp(
          `Error: Vault creation requires a minInitialDebt of {"brand":"\\[Alleged: IST brand\\]","value":"\\[${minInitialDebt * 1_000_000n}n\\]"}`,
        ),
      },
    );

    const activeVaultsAfter = await agopsVaults(GOV1ADDR);
    t.log('active vaults after:', activeVaultsAfter);

    t.is(
      activeVaultsAfter.length,
      activeVaultsBefore.length,
      'The number of active vaults should remain the same.',
    );
  },
);

test.serial('user cannot open a vault above debt limit', async t => {
  const activeVaultsBefore = await agopsVaults(GOV1ADDR);
  t.log('active vaults before:', activeVaultsBefore);

  const { availableDebtForMint, debtLimit, totalDebt } =
    await getAvailableDebtForMint(VAULT_MANAGER);

  const mint = availableDebtForMint + 5n;
  const collateral = mint * 2n;

  const { adjustedToMintAmount } = await calculateMintFee(mint, VAULT_MANAGER);
  await t.throwsAsync(
    () => openVault(GOV1ADDR, mint.toString(), collateral.toString()),
    {
      message: new RegExp(
        `Minting {"brand":"\\[Alleged: IST brand\\]","value":"\\[${adjustedToMintAmount.value}n\\]"} past {"brand":"\\[Alleged: IST brand\\]","value":"\\[${totalDebt}n\\]"} would hit total debt limit {"brand":"\\[Alleged: IST brand\\]","value":"\\[${debtLimit}n\\]"}`,
      ),
    },
  );

  const activeVaultsAfter = await agopsVaults(GOV1ADDR);
  t.log('active vaults after:', activeVaultsAfter);

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length,
    `The number of active vaults should stay the same.`,
  );
});

test.serial('user can open a vault under debt limit', async t => {
  const istBalanceBefore = await getISTBalance(GOV1ADDR);
  const activeVaultsBefore = await agopsVaults(GOV1ADDR);
  t.log('uist balance before:', istBalanceBefore);
  t.log('active vaults before:', activeVaultsBefore);

  const { availableDebtForMint } = await getAvailableDebtForMint(VAULT_MANAGER);

  const mint = availableDebtForMint - 1_000_000n;
  const collateral = availableDebtForMint * 2n;

  await openVault(GOV1ADDR, mint.toString(), collateral.toString());

  const istBalanceAfter = await getISTBalance(GOV1ADDR);
  const activeVaultsAfter = await agopsVaults(GOV1ADDR);
  t.log('uist balance after:', istBalanceAfter);
  t.log('active vaults after:', activeVaultsAfter);

  t.is(
    istBalanceBefore + Number(mint),
    istBalanceAfter,
    'The IST balance should increase by the minted amount',
  );
  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length + 1,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('user cannot increased vault debt above debt limit', async t => {
  const { vaultID, debt: debtBefore } = await getLastVaultFromAddress(GOV1ADDR);
  t.log('vault debt before:', debtBefore);

  const { availableDebtForMint, debtLimit, totalDebt } =
    await getAvailableDebtForMint(VAULT_MANAGER);

  const { adjustedToMintAmount } = await calculateMintFee(
    availableDebtForMint,
    VAULT_MANAGER,
  );

  // The availableDebtForMint + mintFee will surpass the debt limit
  const mint = Number(availableDebtForMint);
  await t.throwsAsync(
    () =>
      adjustVault(GOV1ADDR, vaultID, {
        wantMinted: mint,
      }),
    {
      message: new RegExp(
        `Minting {"brand":"\\[Alleged: IST brand\\]","value":"\\[${adjustedToMintAmount.value}n\\]"} past {"brand":"\\[Alleged: IST brand\\]","value":"\\[${totalDebt}n\\]"} would hit total debt limit {"brand":"\\[Alleged: IST brand\\]","value":"\\[${debtLimit}n\\]"}`,
      ),
    },
  );

  const { debt: debtAfter } = await getLastVaultFromAddress(GOV1ADDR);
  t.log('vault debt after:', debtAfter);

  t.is(debtAfter, debtBefore, 'The vault Debt should stay the same');
});

test.serial(
  'Minting Fee is applied to users debt when creating a vault and minting more IST',
  async t => {
    const mint = 5n;
    const collateral = mint * 2n;
    await openVault(GOV1ADDR, mint.toString(), collateral.toString());

    const { adjustedToMintAmount } = await calculateMintFee(
      mint,
      VAULT_MANAGER,
    );
    t.log('mint + fee:', adjustedToMintAmount.value);

    const { vaultID, debt: debtAfterOpenVault } =
      await getLastVaultFromAddress(GOV1ADDR);
    t.log('vault debt after open:', debtAfterOpenVault);

    t.is(
      debtAfterOpenVault,
      adjustedToMintAmount.value,
      'The vault Debt should be equal to mint + fee',
    );

    await adjustVault(GOV1ADDR, vaultID, { wantMinted: 1.0 });

    const { adjustedToMintAmount: adjustedToMintAmountAfter } =
      await calculateMintFee(1n, VAULT_MANAGER);
    t.log('wantMinted + fee:', adjustedToMintAmountAfter.value);

    const { debt: debtAfterAdjustVault } =
      await getLastVaultFromAddress(GOV1ADDR);
    t.log('vault debt after adjust:', debtAfterAdjustVault);

    t.is(
      debtAfterAdjustVault,
      debtAfterOpenVault + adjustedToMintAmountAfter.value,
      'The vault Debt after adjusting should be equal to debt after open + wantMinted + fee',
    );
  },
);

test.serial('confirm that Oracle prices are being received', async t => {
  const quotePath = `published.vaultFactory.managers.${VAULT_MANAGER}.quotes`;
  const quote = await getContractInfo(quotePath, {
    agoric,
    prefix: '',
  });

  t.log('quote:', quote);
  t.assert(quote);
});

test.serial(
  'Confirm that vaults that existed before the most recent upgrade continue to be useable',
  async t => {
    /*
     * The long-living-vault user is being created and used to open a vault in the n:upgrade-next proposal USE phase.
     * The offer to open a vault is implemented in a3p-integration/proposals/n:upgrade-next/openVault.js
     */
    const user = await getUser('long-living-vault');

    const {
      vaultID,
      debt: debtAfterOpenVault,
      collateral: collateralBefore,
    } = await getLastVaultFromAddress(user);
    t.log('vault debt after open:', debtAfterOpenVault);
    t.log('vault collateral before:', collateralBefore);

    await adjustVault(user, vaultID, { wantCollateral: 1.0 });

    const { collateral: collateralAfter } = await getLastVaultFromAddress(user);
    t.log('vault collateral after:', collateralAfter);

    t.is(
      collateralBefore,
      collateralAfter + 1_000_000n,
      'The vault Collateral should decrease after removing some ATOM',
    );

    await closeVault(user, vaultID, 6.03);

    const { state } = await getLastVaultFromAddress(user);
    t.log('vault state:', state);

    t.is(state, 'closed', 'The vault should be in the "closed" state.');
  },
);
