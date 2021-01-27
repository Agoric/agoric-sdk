package cli

import (
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func GetTxCmd(storeKey string) *cobra.Command {
	swingsetTxCmd := &cobra.Command{
		Use:                        types.ModuleName,
		Short:                      "SwingSet transaction subcommands",
		DisableFlagParsing:         true,
		SuggestionsMinimumDistance: 2,
		RunE:                       client.ValidateCmd,
	}

	swingsetTxCmd.AddCommand(
		GetCmdDeliver(),
		GetCmdProvisionOne(),
	)

	return swingsetTxCmd
}

// GetCmdDeliver is the CLI command for sending a DeliverInbound transaction
func GetCmdDeliver() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "deliver [json string]",
		Short: "deliver inbound messages",
		Args:  cobra.ExactArgs(1),

		RunE: func(cmd *cobra.Command, args []string) error {
			cctx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

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

			msg := types.NewMsgDeliverInbound(msgs, cctx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(cctx, cmd.Flags(), msg)
		},
	}
	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

// GetCmdProvision is the CLI command for sending a Provision transaction
func GetCmdProvisionOne() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "provision-one [nickname] [address] [power-flags]",
		Short: "provision a single address",
		Args:  cobra.RangeArgs(2, 3),

		RunE: func(cmd *cobra.Command, args []string) error {
			cctx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			addr, err := sdk.AccAddressFromBech32(args[1])
			if err != nil {
				return err
			}

			var powerFlags []string
			if len(args) > 2 {
				powerFlags = strings.Split(args[2], ",")
			}

			msg := types.NewMsgProvision(args[0], addr, powerFlags, cctx.GetFromAddress())
			if err := msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(cctx, cmd.Flags(), msg)
		},
	}

	flags.AddTxFlagsToCmd(cmd)
	return cmd
}
