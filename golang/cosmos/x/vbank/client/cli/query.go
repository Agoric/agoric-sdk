package cli

import (
	"github.com/spf13/cobra"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
)

// GetQueryCmd returns the cli query commands for this module
func GetQueryCmd() *cobra.Command {
	vbankQueryCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Querying commands for the vbank module",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	vbankQueryCmd.AddCommand(
		GetCmdQueryParams(),
		GetCmdQueryState(),
	)

	return vbankQueryCmd
}

// GetCmdQueryParams implements the query params command.
func GetCmdQueryParams() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "params",
		Args:  cobra.NoArgs,
		Short: "Query vbank params",
		RunE: func(cmd *cobra.Command, _ []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			res, err := queryClient.Params(cmd.Context(), &types.QueryParamsRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(&res.Params)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// GetCmdQueryState implements the query state command.
func GetCmdQueryState() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "state",
		Args:  cobra.NoArgs,
		Short: "Query vbank state",
		RunE: func(cmd *cobra.Command, _ []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			res, err := queryClient.State(cmd.Context(), &types.QueryStateRequest{})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(&res.State)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
