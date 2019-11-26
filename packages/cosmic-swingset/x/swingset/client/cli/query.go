package cli

import (
	"fmt"
	"os"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
	"github.com/spf13/cobra"
)

func GetQueryCmd(storeKey string, cdc *codec.Codec) *cobra.Command {
	swingsetQueryCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "Querying commands for the swingset module",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}
	swingsetQueryCmd.AddCommand(client.GetCommands(
		GetCmdGetStorage(storeKey, cdc),
		GetCmdGetKeys(storeKey, cdc),
		GetCmdMailbox(storeKey, cdc),
	)...)
	return swingsetQueryCmd
}


// GetCmdGetStorage queries information about storage
func GetCmdGetStorage(queryRoute string, cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "storage [path]",
		Short: "get storage for path",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc)
			path := args[0]

			res, _, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/storage/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find storage path - %s: %s\n", path, err)
				return nil
			}

			var out types.QueryResStorage
			cdc.MustUnmarshalJSON(res, &out)
			return cliCtx.PrintOutput(out)
		},
	}
}

// GetCmdGetKeys queries storage keys
func GetCmdGetKeys(queryRoute string, cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "keys [path]",
		Short: "get storage subkeys for path",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc)
			var path string
			if len(args) > 0 {
				path = args[0]
			}

			res, _, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/keys/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find keys path - %s: %s\n", path, err)
				return nil
			}

			var out types.QueryResKeys
			cdc.MustUnmarshalJSON(res, &out)
			return cliCtx.PrintOutput(out)
		},
	}
}

// GetCmdMailbox queries information about a mailbox
func GetCmdMailbox(queryRoute string, cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "mailbox [peer]",
		Short: "get mailbox for peer",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc)
			peer := args[0]

			res, _, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/mailbox/%s", queryRoute, peer), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find peer mailbox - %s: %s\n", peer, err)
				return nil
			}

			var out types.QueryResStorage
			cdc.MustUnmarshalJSON(res, &out)
			return cliCtx.PrintOutput(out)
		},
	}
}
