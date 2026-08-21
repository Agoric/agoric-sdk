package cmd

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

const minGasPricesSentinel = "min"

func addMinGasPricesResolver(rootCmd *cobra.Command) {
	txCmd := findChildCommand(rootCmd, "tx")
	if txCmd == nil {
		return
	}
	wrapTxLeaves(txCmd, &minGasPricesResolver{})
}

type minGasPricesResolver struct {
	cached  sdk.DecCoins
	queried bool
}

func wrapTxLeaves(cmd *cobra.Command, resolver *minGasPricesResolver) {
	children := cmd.Commands()
	if len(children) == 0 {
		wrapMinGasPricesResolver(cmd, resolver)
		return
	}
	for _, child := range children {
		wrapTxLeaves(child, resolver)
	}
}

func wrapMinGasPricesResolver(cmd *cobra.Command, resolver *minGasPricesResolver) {
	if !hasTxFeeFlags(cmd.Flags()) {
		return
	}
	appendToPreRunE(cmd, resolver.resolveMinGasPricesFlag)
}

func hasTxFeeFlags(flagSet *pflag.FlagSet) bool {
	return flagSet.Lookup(flags.FlagGas) != nil &&
		flagSet.Lookup(flags.FlagFees) != nil &&
		flagSet.Lookup(flags.FlagGasPrices) != nil
}

func (resolver *minGasPricesResolver) resolveMinGasPricesFlag(cmd *cobra.Command, _ []string) error {
	flagSet := cmd.Flags()
	if !hasTxFeeFlags(flagSet) {
		return nil
	}

	gasPrices, err := flagSet.GetString(flags.FlagGasPrices)
	if err != nil {
		return err
	}
	if gasPrices != "" && gasPrices != minGasPricesSentinel {
		if _, err := sdk.ParseDecCoins(gasPrices); err != nil {
			return fmt.Errorf("invalid --%s=%q: %w", flags.FlagGasPrices, gasPrices, err)
		}
		return nil
	}
	if flagSet.Changed(flags.FlagFees) {
		if gasPrices == minGasPricesSentinel {
			return fmt.Errorf("cannot resolve --%s=%s when --%s is supplied", flags.FlagGasPrices, minGasPricesSentinel, flags.FlagFees)
		}
		return nil
	}

	gas, err := flagSet.GetString(flags.FlagGas)
	if err != nil {
		return err
	}
	if gasPrices == "" && !flagSet.Changed(flags.FlagGasPrices) {
		if gas != flags.GasFlagAuto {
			return nil
		}
		gasPrices = minGasPricesSentinel
	}
	if gasPrices != minGasPricesSentinel {
		return nil
	}

	minGasPrices, err := resolver.getMinGasPrices(cmd)
	if err != nil {
		return err
	}
	if len(minGasPrices) == 0 {
		cmd.PrintErrln(fmt.Sprintf("warning: cannot resolve --%s=%s because swingset params min_gas_price is empty; continuing without --%s", flags.FlagGasPrices, minGasPricesSentinel, flags.FlagGasPrices))
		return flagSet.Set(flags.FlagGasPrices, "")
	}
	minGasPrice, warning, err := selectMinGasPrice(minGasPrices, "")
	if err != nil {
		return err
	}
	if warning != "" {
		cmd.PrintErrln(warning)
	}
	return flagSet.Set(flags.FlagGasPrices, minGasPrice.String())
}

func (resolver *minGasPricesResolver) getMinGasPrices(cmd *cobra.Command) (sdk.DecCoins, error) {
	if resolver.queried {
		return resolver.cached, nil
	}
	queryCtx, err := client.GetClientQueryContext(cmd)
	if err != nil {
		return nil, err
	}
	queryClient := swingsettypes.NewQueryClient(queryCtx)
	resp, err := queryClient.Params(cmd.Context(), &swingsettypes.QueryParamsRequest{})
	if err != nil {
		return nil, err
	}
	resolver.cached = resp.Params.MinGasPrice
	resolver.queried = true
	return resolver.cached, nil
}

func selectMinGasPrice(minGasPrices sdk.DecCoins, feeDenom string) (sdk.DecCoin, string, error) {
	if len(minGasPrices) == 0 {
		return sdk.DecCoin{}, "", fmt.Errorf("cannot resolve --%s=%s: swingset params min_gas_price is empty", flags.FlagGasPrices, minGasPricesSentinel)
	}
	if feeDenom != "" {
		for _, price := range minGasPrices {
			if price.Denom == feeDenom {
				return price, "", nil
			}
		}
		return sdk.DecCoin{}, "", fmt.Errorf("cannot resolve --%s=%s: swingset params min_gas_price has no entry for %s", flags.FlagGasPrices, minGasPricesSentinel, feeDenom)
	}
	if len(minGasPrices) == 1 {
		return minGasPrices[0], "", nil
	}
	return minGasPrices[0], fmt.Sprintf("warning: --%s=%s is ambiguous because swingset params min_gas_price has multiple entries; using %s", flags.FlagGasPrices, minGasPricesSentinel, minGasPrices[0]), nil
}
