package cli

import (
	"fmt"
	"io/ioutil"

	"github.com/spf13/cobra"

	"github.com/Agoric/cosmic-swingset/x/swingset"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/client/utils"
	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtxb "github.com/cosmos/cosmos-sdk/x/auth/client/txbuilder"
)

// GetCmdDeliver is the CLI command for sending a DeliverInbound transaction
func GetCmdDeliver(cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "deliver [sender] [json string]",
		Short: "deliver inbound messages",
		Args:  cobra.ExactArgs(2),
		
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc).WithAccountDecoder(cdc)

			txBldr := authtxb.NewTxBuilderFromCLI().WithTxEncoder(utils.GetTxEncoder(cdc))

			if err := cliCtx.EnsureAccountExists(); err != nil {
				return err
			}

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
			msgs, err := swingset.UnmarshalMessagesJSON(jsonIn)
			if err != nil {
				return err
			}

			msg := swingset.NewMsgDeliverInbound(args[0], msgs, cliCtx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			cliCtx.PrintResponse = true

			// return utils.CompleteAndBroadcastTxCLI(txBldr, cliCtx, msgs)
			return utils.GenerateOrBroadcastMsgs(cliCtx, txBldr, []sdk.Msg{msg}, false)
		},
	}
}
