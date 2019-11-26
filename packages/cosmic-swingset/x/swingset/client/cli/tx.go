package cli

import (
	"fmt"
	"io/ioutil"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/client/utils"
	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
)

func GetTxCmd(storeKey string, cdc *codec.Codec) *cobra.Command {
	swingsetTxCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "SwingSet transaction subcommands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	swingsetTxCmd.AddCommand(client.PostCommands(
		GetCmdDeliver(cdc),
	)...)

	return swingsetTxCmd
}

// GetCmdDeliver is the CLI command for sending a DeliverInbound transaction
func GetCmdDeliver(cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "deliver [sender] [json string]",
		Short: "deliver inbound messages",
		Args:  cobra.ExactArgs(2),
		
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc)

			txBldr := auth.NewTxBuilderFromCLI().WithTxEncoder(utils.GetTxEncoder(cdc))

			jsonIn := args[1]
			if jsonIn[0] == '@' {
				fname := args[1][1:]
				if fname == "-" {
					// Reading from stdin.
					if _, err := fmt.Scanln(&jsonIn); err != nil {
						return err
					}
				} else {
					jsonBytes, err := ioutil.ReadFile(fname)
					if err != nil {
						return err
					}
					jsonIn = string(jsonBytes)
				}
			}
			msgs, err := types.UnmarshalMessagesJSON(jsonIn)
			if err != nil {
				return err
			}

			msg := types.NewMsgDeliverInbound(args[0], msgs, cliCtx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			// return utils.CompleteAndBroadcastTxCLI(txBldr, cliCtx, msgs)
			return utils.GenerateOrBroadcastMsgs(cliCtx, txBldr, []sdk.Msg{msg})
		},
	}
}
