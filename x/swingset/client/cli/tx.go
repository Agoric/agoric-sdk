package cli

import (
	"encoding/json"
	"errors"

	"github.com/spf13/cobra"

	"github.com/Agoric/cosmic-swingset/x/swingset"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/client/utils"
	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtxb "github.com/cosmos/cosmos-sdk/x/auth/client/txbuilder"
)

// GetCmdBuyName is the CLI command for sending a BuyName transaction
func GetCmdDeliver(cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "deliver FROM [JSON-STRING]",
		Short: "deliver inbound messages",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			cliCtx := context.NewCLIContext().WithCodec(cdc).WithAccountDecoder(cdc)

			txBldr := authtxb.NewTxBuilderFromCLI().WithTxEncoder(utils.GetTxEncoder(cdc))

			if err := cliCtx.EnsureAccountExists(); err != nil {
				return err
			}
			// [message[], ack]
			// message [num, body]
			packet := make([]interface{}, 2)
			err := json.Unmarshal([]byte(args[1]), &packet)
			if err != nil {
				return err
			}

			ack, ok := packet[1].(int)
			if !ok {
				return errors.New("Ack is not an integer")
			}

			// TODO Parse
			messages := []string{}
			nums := []int{}
			// peer, messages, nums, ack, submitter
			msg := swingset.NewMsgDeliverInbound(args[0], messages, nums, ack, cliCtx.GetFromAddress())
			err = msg.ValidateBasic()
			if err != nil {
				return err
			}

			cliCtx.PrintResponse = true

			// return utils.CompleteAndBroadcastTxCLI(txBldr, cliCtx, msgs)
			return utils.GenerateOrBroadcastMsgs(cliCtx, txBldr, []sdk.Msg{msg}, false)
		},
	}
}
