package cli

import (
	"fmt"
	"os"

	"github.com/Agoric/cosmic-swingset/x/swingset"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/spf13/cobra"
)

// GetCmdGetStorage queries information about storage
func GetCmdGetStorage(queryRoute string, cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "storage [path]",
		Short: "get storage for path",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc)
			path := args[0]

			res, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/storage/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find storage path - %s \n", path)
				return nil
			}

			var out swingset.QueryResStorage
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

			res, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/keys/%s", queryRoute, path), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find keys path - %s \n", path)
				return nil
			}

			var out swingset.QueryResKeys
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

			res, err := cliCtx.QueryWithData(fmt.Sprintf("custom/%s/mailbox/%s", queryRoute, peer), nil)
			if err != nil {
				fmt.Fprintf(os.Stderr, "could not find peer mailbox - %s \n", peer)
				return nil
			}

			var out swingset.QueryResStorage
			cdc.MustUnmarshalJSON(res, &out)
			return cliCtx.PrintOutput(out)
		},
	}
}
