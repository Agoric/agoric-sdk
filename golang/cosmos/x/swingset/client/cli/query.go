package cli

import (
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/spf13/cobra"
)

func GetQueryCmd(storeKey string) *cobra.Command {
	swingsetQueryCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Querying commands for the swingset module",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}
	swingsetQueryCmd.AddCommand(
		GetCmdGetEgress(storeKey),
		GetCmdQueryParams(storeKey),
		GetCmdGetStorage(storeKey),
		GetCmdGetKeys(storeKey),
		GetCmdMailbox(storeKey),
	)

	return swingsetQueryCmd
}

func GetCmdQueryParams(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "params",
		Args:  cobra.NoArgs,
		Short: "Query swingset params",
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

func GetCmdGetEgress(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "egress [account]",
		Short: "get egress info for account",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			peer, err := sdk.AccAddressFromBech32(args[0])
			if err != nil {
				return err
			}

			res, err := queryClient.Egress(cmd.Context(), &types.QueryEgressRequest{
				Peer: peer,
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

// GetCmdGetStorage queries information about storage
func GetCmdGetStorage(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "storage [path]",
		Short: "get storage for path",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			path := strings.Split(args[0], ".")

			res, err := queryClient.Storage(cmd.Context(), &types.QueryStorageRequest{
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

// GetCmdGetKeys queries storage keys
func GetCmdGetKeys(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "keys [path]",
		Short: "get storage subkeys for path",
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

// GetCmdMailbox queries information about a mailbox
func GetCmdMailbox(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "mailbox [peer]",
		Short: "get mailbox for peer",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientQueryContext(cmd)
			if err != nil {
				return err
			}
			queryClient := types.NewQueryClient(clientCtx)

			peer, err := sdk.AccAddressFromBech32(args[0])
			if err != nil {
				return err
			}

			res, err := queryClient.Mailbox(cmd.Context(), &types.QueryMailboxRequest{
				Peer: peer,
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
