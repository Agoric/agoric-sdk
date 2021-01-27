package cli

import (
	"fmt"
	"os"

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
		GetCmdGetStorage(storeKey),
		GetCmdGetKeys(storeKey),
		GetCmdMailbox(storeKey),
	)

	return swingsetQueryCmd
}

func GetCmdGetEgress(queryRoute string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "egress [account]",
		Short: "get egress info for account",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cctx := client.GetClientContextFromCmd(cmd)
			bech32 := args[0]

			res, _, err := cctx.QueryWithData(fmt.Sprintf("custom/%s/egress/%s", queryRoute, bech32), nil)
			if err != nil {
				// Exit while indicating failure.
				fmt.Fprintln(os.Stderr, err)
				os.Exit(1)
			}

			var out types.Egress
			cctx.JSONMarshaler.MustUnmarshalJSON(res, &out)
			return cctx.PrintObjectLegacy(&out)
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
			cctx := client.GetClientContextFromCmd(cmd)
			path := args[0]

			res, _, err := cctx.QueryWithData(fmt.Sprintf("custom/%s/storage/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find storage path - %s: %s\n", path, err)
				return nil
			}

			var out types.Storage
			cctx.JSONMarshaler.MustUnmarshalJSON(res, &out)
			return cctx.PrintObjectLegacy(&out)
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
			cctx := client.GetClientContextFromCmd(cmd)
			var path string
			if len(args) > 0 {
				path = args[0]
			}

			res, _, err := cctx.QueryWithData(fmt.Sprintf("custom/%s/keys/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find keys path - %s: %s\n", path, err)
				return nil
			}

			var out types.Keys
			cctx.JSONMarshaler.MustUnmarshalJSON(res, &out)
			return cctx.PrintObjectLegacy(&out)
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
			cctx := client.GetClientContextFromCmd(cmd)
			peer := args[0]

			res, _, err := cctx.QueryWithData(fmt.Sprintf("custom/%s/mailbox/%s", queryRoute, peer), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find peer mailbox - %s: %s\n", peer, err)
				return nil
			}

			var out types.Storage
			cctx.JSONMarshaler.MustUnmarshalJSON(res, &out)
			return cctx.PrintObjectLegacy(&out)
		},
	}

	flags.AddQueryFlagsToCmd(cmd)
	return cmd
}
