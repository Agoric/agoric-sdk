package cmd

import (
	"bytes"
	"testing"

	sdkmath "cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/client/flags"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/require"
)

func TestSelectMinGasPrice(t *testing.T) {
	prices := sdk.DecCoins{
		sdk.NewDecCoinFromDec("ubld", sdkmath.LegacyMustNewDecFromStr("0.01")),
		sdk.NewDecCoinFromDec("urun", sdkmath.LegacyMustNewDecFromStr("0.02")),
	}

	price, warning, err := selectMinGasPrice(prices, "urun")
	require.NoError(t, err)
	require.Empty(t, warning)
	require.Equal(t, prices[1], price)

	price, warning, err = selectMinGasPrice(prices[:1], "")
	require.NoError(t, err)
	require.Empty(t, warning)
	require.Equal(t, prices[0], price)

	price, warning, err = selectMinGasPrice(prices, "")
	require.NoError(t, err)
	require.Contains(t, warning, "ambiguous")
	require.Equal(t, prices[0], price)
}

func TestSelectMinGasPriceErrors(t *testing.T) {
	_, _, err := selectMinGasPrice(nil, "")
	require.ErrorContains(t, err, "min_gas_price is empty")

	prices := sdk.DecCoins{
		sdk.NewDecCoinFromDec("ubld", sdkmath.LegacyMustNewDecFromStr("0.01")),
	}
	_, _, err = selectMinGasPrice(prices, "urun")
	require.ErrorContains(t, err, "no entry for urun")
}

func TestResolveMinGasPricesFlagRejectsInvalidExplicitGasPrices(t *testing.T) {
	cmd := newTxFeeFlagCommand()
	require.NoError(t, cmd.Flags().Set(flags.FlagGasPrices, "max"))

	err := (&minGasPricesResolver{}).resolveMinGasPricesFlag(cmd, nil)
	require.ErrorContains(t, err, `invalid --gas-prices="max"`)
}

func TestResolveMinGasPricesFlagRejectsMinWithExplicitFees(t *testing.T) {
	cmd := newTxFeeFlagCommand()
	require.NoError(t, cmd.Flags().Set(flags.FlagFees, "12ubld"))
	require.NoError(t, cmd.Flags().Set(flags.FlagGasPrices, minGasPricesSentinel))

	err := (&minGasPricesResolver{}).resolveMinGasPricesFlag(cmd, nil)
	require.ErrorContains(t, err, "cannot resolve --gas-prices=min when --fees is supplied")
}

func TestResolveMinGasPricesFlagFallsBackWhenParamsAreEmpty(t *testing.T) {
	cmd := newTxFeeFlagCommand()
	stderr := &bytes.Buffer{}
	cmd.SetErr(stderr)
	require.NoError(t, cmd.Flags().Set(flags.FlagGas, flags.GasFlagAuto))

	err := (&minGasPricesResolver{queried: true}).resolveMinGasPricesFlag(cmd, nil)
	require.NoError(t, err)
	require.Contains(t, stderr.String(), "min_gas_price is empty")
	gasPrices, err := cmd.Flags().GetString(flags.FlagGasPrices)
	require.NoError(t, err)
	require.Empty(t, gasPrices)
}

func newTxFeeFlagCommand() *cobra.Command {
	cmd := &cobra.Command{Use: "test"}
	flagSet := cmd.Flags()
	flagSet.String(flags.FlagGas, "", "")
	flagSet.String(flags.FlagFees, "", "")
	flagSet.String(flags.FlagGasPrices, "", "")
	return cmd
}
