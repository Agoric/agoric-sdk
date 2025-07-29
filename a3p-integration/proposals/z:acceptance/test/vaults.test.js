/* eslint-env node */
import test from 'ava';

import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import {
  adjustVault,
  ATOM_DENOM,
  closeVault,
  generateOracleMap,
  getISTBalance,
  getPriceQuote,
  getUser,
  getVaultPrices,
  GOV1ADDR,
  GOV2ADDR,
  openVault,
  USER1ADDR,
} from '@agoric/synthetic-chain';
import { agdWalletUtils } from './test-lib/index.js';
import {
  getPriceFeedRoundId,
  verifyPushedPrice,
} from './test-lib/price-feed.js';
import { bankSend, tryISTBalances } from './test-lib/psm-lib.js';
import { getBalances, listVaults } from './test-lib/utils.js';
import {
  calculateMintFee,
  getAvailableDebtForMint,
  getLastVaultFromAddress,
  getMinInitialDebt,
  setDebtLimit,
} from './test-lib/vaults.js';

const VAULT_MANAGER = 'manager0';

/** @type {(x: number) => number} */
const scale6 = x => x * 1_000_000;

// TODO produce this dynamically from an Offers object exported from a package clientSupport
const exec = {
  vaults: {
    // TODO decide how to handle defaults, whether CLI and this should have the same
    /**
     * @param {string} from
     * @param {Parameters<typeof Offers.vaults.OpenVault>[1]['wantMinted']} wantMinted
     * @param {Parameters<typeof Offers.vaults.OpenVault>[1]['giveCollateral']} giveCollateral
     * @param {Parameters<typeof Offers.vaults.OpenVault>[1]['offerId']} offerId
     * @param {Parameters<typeof Offers.vaults.OpenVault>[1]['collateralBrandKey']} collateralBrandKey
     */
    OpenVault: (
      from,
      wantMinted,
      giveCollateral,
      offerId = `openVault-${Date.now()}`,
      collateralBrandKey = 'ATOM',
    ) => {
      const offer = Offers.vaults.OpenVault(agdWalletUtils.agoricNames, {
        giveCollateral,
        wantMinted,
        offerId,
        collateralBrandKey,
      });
      return agdWalletUtils.broadcastBridgeAction(from, {
        method: 'executeOffer',
        offer,
      });
    },
  },
};

test.serial('open new vault', async t => {
  await bankSend(USER1ADDR, `20000000${ATOM_DENOM}`);

  const istBalanceBefore = await getISTBalance(USER1ADDR);
  const activeVaultsBefore = await listVaults(USER1ADDR, agdWalletUtils);

  const mint = 5.0;
  const collateral = 10.0;
  await exec.vaults.OpenVault(USER1ADDR, mint, collateral);

  const istBalanceAfter = await getISTBalance(USER1ADDR);
  const activeVaultsAfter = await listVaults(USER1ADDR, agdWalletUtils);

  await tryISTBalances(
    t,
    scale6(istBalanceAfter),
    scale6(istBalanceBefore + 5),
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

  await adjustVault(USER1ADDR, vaultID, { wantCollateral: 1.0 });

  const { collateral: collateralAfter } =
    await getLastVaultFromAddress(USER1ADDR);

  t.is(
    collateralBefore,
    collateralAfter + 1_000_000n,
    'The vault Collateral should decrease after removing some ATOM',
  );
});

test.serial('remove IST', async t => {
  const { vaultID, debt: debtBefore } =
    await getLastVaultFromAddress(USER1ADDR);

  await adjustVault(USER1ADDR, vaultID, { wantMinted: 1.0 });

  const { debt: debtAfter } = await getLastVaultFromAddress(USER1ADDR);

  t.is(
    debtAfter,
    debtBefore + 1_005_000n,
    'The vault Debt should increase after removing some IST',
  );
});

test.serial('add collateral', async t => {
  const { vaultID, collateral: collateralBefore } =
    await getLastVaultFromAddress(USER1ADDR);

  await adjustVault(USER1ADDR, vaultID, { giveCollateral: 1.0 });

  const { collateral: collateralAfter } =
    await getLastVaultFromAddress(USER1ADDR);

  t.is(
    collateralAfter,
    collateralBefore + 1_000_000n,
    'The vault Collateral should increase after adding some ATOM',
  );
});

test.serial('add IST', async t => {
  const { vaultID, debt: debtBefore } =
    await getLastVaultFromAddress(USER1ADDR);

  await adjustVault(USER1ADDR, vaultID, { giveMinted: 1.0 });

  const { debt: debtAfter } = await getLastVaultFromAddress(USER1ADDR);

  t.is(
    debtAfter,
    debtBefore - 1_000_000n,
    'The vault Debt should decrease after adding some IST',
  );
});

test.serial('close vault', async t => {
  const { vaultID, collateral } = await getLastVaultFromAddress(USER1ADDR);
  const atomBalanceBefore = await getBalances([USER1ADDR], ATOM_DENOM);

  await closeVault(USER1ADDR, vaultID, 6.035);

  const atomBalanceAfter = await getBalances([USER1ADDR], ATOM_DENOM);
  const { state } = await getLastVaultFromAddress(USER1ADDR);

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
    const activeVaultsBefore = await listVaults(GOV1ADDR, agdWalletUtils);

    const minInitialDebt = await getMinInitialDebt();

    const mint = minInitialDebt - 1n;
    const collateral = mint * 2n;

    await t.throwsAsync(
      () => openVault(GOV1ADDR, mint.toString(), collateral.toString()),
      {
        message: /Error: Vault creation requires a minInitialDebt/,
      },
    );

    const activeVaultsAfter = await listVaults(GOV1ADDR, agdWalletUtils);

    t.is(
      activeVaultsAfter.length,
      activeVaultsBefore.length,
      'The number of active vaults should remain the same.',
    );
  },
);

test.serial('user cannot open a vault above debt limit', async t => {
  const activeVaultsBefore = await listVaults(GOV1ADDR, agdWalletUtils);

  const { availableDebtForMint } = await getAvailableDebtForMint(VAULT_MANAGER);

  const mint = availableDebtForMint + 5n;
  const collateral = mint * 2n;

  await t.throwsAsync(
    () => openVault(GOV1ADDR, mint.toString(), collateral.toString()),
    {
      message: /Error: Minting.*would hit total debt limit/,
    },
  );

  const activeVaultsAfter = await listVaults(GOV1ADDR, agdWalletUtils);

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length,
    `The number of active vaults should stay the same.`,
  );
});

test.serial('user can open a vault under debt limit', async t => {
  const istBalanceBefore = await getISTBalance(GOV1ADDR);
  const activeVaultsBefore = await listVaults(GOV1ADDR, agdWalletUtils);

  const { availableDebtForMint } = await getAvailableDebtForMint(VAULT_MANAGER);

  const mint = availableDebtForMint - 1_000_000n;
  const collateral = availableDebtForMint * 2n;

  await openVault(GOV1ADDR, mint.toString(), collateral.toString());

  const istBalanceAfter = await getISTBalance(GOV1ADDR);
  const activeVaultsAfter = await listVaults(GOV1ADDR, agdWalletUtils);

  await tryISTBalances(
    t,
    scale6(istBalanceAfter),
    scale6(istBalanceBefore + Number(mint)),
  );

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length + 1,
    `The number of active vaults should increase after opening a new vault.`,
  );
});

test.serial('user cannot increased vault debt above debt limit', async t => {
  const { vaultID, debt: debtBefore } = await getLastVaultFromAddress(GOV1ADDR);

  const { availableDebtForMint } = await getAvailableDebtForMint(VAULT_MANAGER);

  // The availableDebtForMint + mintFee will surpass the debt limit
  const mint = Number(availableDebtForMint);
  await t.throwsAsync(
    () =>
      adjustVault(GOV1ADDR, vaultID, {
        wantMinted: mint,
      }),
    {
      message: /Error: Minting.*would hit total debt limit/,
    },
  );

  const { debt: debtAfter } = await getLastVaultFromAddress(GOV1ADDR);

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

    const { vaultID, debt: debtAfterOpenVault } =
      await getLastVaultFromAddress(GOV1ADDR);

    t.is(
      debtAfterOpenVault,
      adjustedToMintAmount.value,
      'The vault Debt should be equal to mint + fee',
    );

    await adjustVault(GOV1ADDR, vaultID, { wantMinted: 1.0 });

    const { adjustedToMintAmount: adjustedToMintAmountAfter } =
      await calculateMintFee(1n, VAULT_MANAGER);

    const { debt: debtAfterAdjustVault } =
      await getLastVaultFromAddress(GOV1ADDR);

    t.is(
      debtAfterAdjustVault,
      debtAfterOpenVault + adjustedToMintAmountAfter.value,
      'The vault Debt after adjusting should be equal to debt after open + wantMinted + fee',
    );
  },
);

test.serial('confirm that Oracle prices are being received', async t => {
  /*
   * The Oracle for ATOM and stATOM brands are being registered in the offer made at file:
   * a3p-integration/proposals/n:upgrade-next/verifyPushedPrice.js
   * which is being executed during the use phase of upgrade-next proposal
   */
  const ATOMManagerIndex = 0;
  const BRANDS = ['ATOM'];
  const BASE_ID = 'n-upgrade';
  const oraclesByBrand = generateOracleMap(BASE_ID, BRANDS);

  const latestRoundId = await getPriceFeedRoundId(BRANDS[0]);
  const roundId = latestRoundId + 1;

  await verifyPushedPrice(oraclesByBrand, BRANDS[0], 10, roundId);

  const atomQuote = await getPriceQuote(BRANDS[0]);
  t.is(
    atomQuote,
    '+10000000',
    'ATOM price quote does not match the expected value',
  );

  const vaultQuote = await getVaultPrices(ATOMManagerIndex);

  t.true(
    vaultQuote.value[0].amountIn.brand.includes(' ATOM '),
    'ATOM price quote not found',
  );
  t.is(
    vaultQuote.value[0].amountOut.value,
    atomQuote,
    'Vault price quote does not match the expected ATOM price quote',
  );
});

test.serial(
  'Confirm that vaults that existed before the most recent upgrade continue to be useable',
  async t => {
    /*
     * The long-living-vault user is being created and used to open a vault in the n:upgrade-next proposal USE phase.
     * The offer to open a vault is implemented in a3p-integration/proposals/n:upgrade-next/openVault.js
     */
    const user = await getUser('long-living-vault');

    const { vaultID, collateral: collateralBefore } =
      await getLastVaultFromAddress(user);

    await adjustVault(user, vaultID, { wantCollateral: 1.0 });

    const { collateral: collateralAfter } = await getLastVaultFromAddress(user);

    t.is(
      collateralBefore,
      collateralAfter + 1_000_000n,
      'The vault Collateral should decrease after removing some ATOM',
    );

    await closeVault(user, vaultID, 6.03);

    const { state } = await getLastVaultFromAddress(user);

    t.is(state, 'closed', 'The vault should be in the "closed" state.');
  },
);

test.serial(
  'User can pay off debt when totalDebt is above debtLimit',
  async t => {
    const mint = '5.0';
    const collateral = '10.0';
    await openVault(GOV1ADDR, mint, collateral);

    const { totalDebt: totalDebtBefore } =
      await getAvailableDebtForMint(VAULT_MANAGER);

    // provision governance wallet to cover transaction fees
    await bankSend(GOV2ADDR, `10000000ubld`, GOV1ADDR);

    const limit = (totalDebtBefore - 10_000_000n) / 1_000_000n;
    await setDebtLimit(GOV1ADDR, limit);

    const { debtLimit: debtLimitAfter, totalDebt: totalDebtAfter } =
      await getAvailableDebtForMint(VAULT_MANAGER);
    t.true(
      debtLimitAfter < totalDebtAfter,
      'debtLimit should be less than totalDebt',
    );

    const { vaultID, debt: vaultDebtBefore } =
      await getLastVaultFromAddress(GOV1ADDR);

    await adjustVault(GOV1ADDR, vaultID, {
      giveMinted: Number(vaultDebtBefore) / 1_000_000,
    });

    const { debt: vaultDebtAfter } = await getLastVaultFromAddress(GOV1ADDR);

    t.is(vaultDebtAfter, 0n, 'The vault Debt should have been erased');
  },
);
