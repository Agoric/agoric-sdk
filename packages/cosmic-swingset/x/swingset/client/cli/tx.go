package cli

import (
	"bufio"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/context"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/codec"

	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/auth"
	authclient "github.com/cosmos/cosmos-sdk/x/auth/client"
)

func GetTxCmd(storeKey string, cdc *codec.Codec) *cobra.Command {
	swingsetTxCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "SwingSet transaction subcommands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	swingsetTxCmd.AddCommand(flags.PostCommands(
		GetCmdDeliver(cdc),
		GetCmdProvisionOne(cdc),
	)...)

	return swingsetTxCmd
}

// GetCmdDeliver is the CLI command for sending a DeliverInbound transaction
func GetCmdDeliver(cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "deliver [json string]",
		Short: "deliver inbound messages",
		Args:  cobra.ExactArgs(1),

		RunE: func(cmd *cobra.Command, args []string) error {
			inBuf := bufio.NewReader(cmd.InOrStdin())
			cliCtx := context.NewCLIContext().WithCodec(cdc)

			txBldr := auth.NewTxBuilderFromCLI(inBuf).WithTxEncoder(authclient.GetTxEncoder(cdc))

			jsonIn := args[0]
			if jsonIn[0] == '@' {
				fname := args[0][1:]
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

			msg := types.NewMsgDeliverInbound(msgs, cliCtx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return authclient.GenerateOrBroadcastMsgs(cliCtx, txBldr, []sdk.Msg{msg})
		},
	}
}

// GetCmdProvision is the CLI command for sending a Provision transaction
func GetCmdProvisionOne(cdc *codec.Codec) *cobra.Command {
	return &cobra.Command{
		Use:   "provision-one [nickname] [address] [power-flags]",
		Short: "provision a single address",
		Args:  cobra.RangeArgs(2, 3),

		RunE: func(cmd *cobra.Command, args []string) error {
			inBuf := bufio.NewReader(cmd.InOrStdin())
			cliCtx := context.NewCLIContext().WithCodec(cdc)

			txBldr := auth.NewTxBuilderFromCLI(inBuf).WithTxEncoder(authclient.GetTxEncoder(cdc))

			addr, err := sdk.AccAddressFromBech32(args[1])
			if err != nil {
				return err
			}

			var powerFlags []string
			if len(args) > 2 {
				powerFlags = strings.Split(args[2], ",")
			}

			msg := types.NewMsgProvision(args[0], addr, powerFlags, cliCtx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return authclient.GenerateOrBroadcastMsgs(cliCtx, txBldr, []sdk.Msg{msg})
		},
	}
}
