package cli

import (
	"strings"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"
)

func GetQueryCmd(storeKey string) *cobra.Command {
	swingsetQueryCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Querying commands for the vstorage module",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}
	swingsetQueryCmd.AddCommand(
		GetCmdGetData(storeKey),
		GetCmdGetKeys(storeKey),
	)

	return swingsetQueryCmd
}

// GetCmdGetData queries information about storage
func GetCmdGetData(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "data [path]",
		Short: "get vstorage data for path",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			path := strings.Split(args[0], ".")

			res, err := queryClient.Data(cmd.Context(), &types.QueryDataRequest{
				Path: path,
			})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}

// GetCmdGetKeys queries vstorage keys
func GetCmdGetKeys(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "keys [path]",
		Short: "get vstorage subkey names for path",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			path := []string{""}
			if len(args) > 0 {
				path = strings.Split(args[0], ".")
			}

			res, err := queryClient.Keys(cmd.Context(), &types.QueryKeysRequest{
				Path: path,
			})
			if err != nil {
				return err
			}

			return clientCtx.PrintProto(res)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
