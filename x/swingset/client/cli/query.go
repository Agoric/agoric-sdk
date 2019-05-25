package cli

import (
	"fmt"

	"github.com/Agoric/cosmic-swingset/x/swingset"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/spf13/cobra"
)

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
				fmt.Printf("could not find peer mailbox - %s \n", string(peer))
				return nil
			}

			var out swingset.QueryResMailbox
			cdc.MustUnmarshalJSON(res, &out)
			return cliCtx.PrintOutput(out)
		},
	}
}
