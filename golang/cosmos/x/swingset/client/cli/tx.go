package cli

import (
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/client/tx"
	govcli "github.com/cosmos/cosmos-sdk/x/gov/client/cli"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	FlagAllowSpend = "allow-spend"
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
		GetCmdInstallBundle(),
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

// GetCmdInstallBundle is the CLI command for constructing or sending an
// InstallBundle message in a transaction.
func GetCmdInstallBundle() *cobra.Command {
	cmd := &cobra.Command{
		Use:  "install-bundle <JSON>/@<FILE>/-",
		Args: cobra.ExactArgs(1),

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

			msg := types.NewMsgInstallBundle(jsonIn, cctx.GetFromAddress())
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

// GetCmdWalletAction is the CLI command for sending a WalletAction or WalletSpendAction transaction
func GetCmdWalletAction() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "wallet-action [json string]",
		Short: "perform a wallet action",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			owner := clientCtx.GetFromAddress()
			action := args[0]

			spend, err := cmd.Flags().GetBool(FlagAllowSpend)
			if err != nil {
				return err
			}
			var msg sdk.Msg
			if spend {
				msg = types.NewMsgWalletSpendAction(owner, action)
			} else {
				msg = types.NewMsgWalletAction(owner, action)
			}
			err = msg.ValidateBasic()
			if err != nil {
				return err
			}
			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().Bool(FlagAllowSpend, false, "Allow the WalletAction to spend assets")
	flags.AddTxFlagsToCmd(cmd)
	return cmd
}

func NewCmdSubmitCoreEvalProposal() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "swingset-core-eval [[permit.json] [code.js]]...",
		Args:  cobra.MinimumNArgs(2),
		Short: "Submit a proposal to evaluate code in the SwingSet core",
		Long: `Submit a SwingSet evaluate core Compartment code proposal along with an initial deposit.
Specify at least one pair of permit.json and code.js files`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args)%2 != 0 {
				return fmt.Errorf("must specify an even number of permit.json and code.js files")
			}

			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return err
			}

			title, err := cmd.Flags().GetString(govcli.FlagTitle)
			if err != nil {
				return err
			}

			description, err := cmd.Flags().GetString(govcli.FlagDescription)
			if err != nil {
				return err
			}

			npairs := len(args) / 2
			evals := make([]types.CoreEval, 0, npairs)
			for j := 0; j < npairs; j++ {
				permitFile := args[j*2]
				permit, err := ioutil.ReadFile(permitFile)
				if err != nil {
					return errors.Wrapf(err, "failed to read permit %s", permitFile)
				}

				codeFile := args[j*2+1]
				code, err := ioutil.ReadFile(codeFile)
				if err != nil {
					return errors.Wrapf(err, "failed to read code %s", codeFile)
				}

				ce := types.CoreEval{
					JsonPermits: string(permit),
					JsCode:      string(code),
				}
				if err = ce.ValidateBasic(); err != nil {
					return errors.Wrapf(err, "cannot validate permit=%s, code=%s", permitFile, codeFile)
				}

				evals = append(evals, ce)
			}

			from := clientCtx.GetFromAddress()
			content := types.NewCoreEvalProposal(title, description, evals)

			depositStr, err := cmd.Flags().GetString(govcli.FlagDeposit)
			if err != nil {
				return err
			}

			deposit, err := sdk.ParseCoinsNormalized(depositStr)
			if err != nil {
				return err
			}

			msg, err := govtypes.NewMsgSubmitProposal(content, deposit, from)
			if err != nil {
				return err
			}

			if err = msg.ValidateBasic(); err != nil {
				return err
			}

			return tx.GenerateOrBroadcastTxCLI(clientCtx, cmd.Flags(), msg)
		},
	}

	cmd.Flags().String(govcli.FlagTitle, "", "title of proposal")
	cmd.Flags().String(govcli.FlagDescription, "", "description of proposal")
	cmd.Flags().String(govcli.FlagDeposit, "", "deposit for proposal")

	return cmd
}
