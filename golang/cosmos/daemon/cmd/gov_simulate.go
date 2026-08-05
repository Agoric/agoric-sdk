package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"

	"cosmossdk.io/simapp/params"

	dbm "github.com/cosmos/cosmos-db"
	sdk "github.com/cosmos/cosmos-sdk/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/server"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
)

func addGovSimulateProposalCommand(txCmd *cobra.Command, ac appCreator, encodingConfig params.EncodingConfig) {
	govCmd := findChildCommand(txCmd, govtypes.ModuleName)
	if govCmd == nil {
		return
	}

	govCmd.AddCommand(newGovSimulateProposalCommand(ac, encodingConfig))
}

func findChildCommand(parent *cobra.Command, name string) *cobra.Command {
	for _, child := range parent.Commands() {
		if child.Name() == name {
			return child
		}
	}
	return nil
}

func newGovSimulateProposalCommand(ac appCreator, encodingConfig params.EncodingConfig) *cobra.Command {
	return &cobra.Command{
		Use:   "simulate-proposal [path/to/proposal-or-tx.json]",
		Short: "Simulate gov v1 proposal message execution against local app state",
		Long: `Simulate gov v1 proposal message execution against local app state.

The input may be a gov v1 proposal JSON file with a top-level "messages" array,
or a tx JSON file with a "body.messages" array. If an input message is
/cosmos.gov.v1.MsgSubmitProposal, the contained proposal messages are simulated.

Simulation uses the same cached message-router dispatch path that x/gov uses
after a proposal passes. The cache is not written, so local app state is not
changed.`,
		Args:          cobra.ExactArgs(1),
		SilenceErrors: true,
		SilenceUsage:  true,
		RunE: func(cmd *cobra.Command, args []string) error {
			msgs, err := readGovProposalSimulationMessages(encodingConfig.Codec, args[0])
			if err != nil {
				return err
			}
			if len(msgs) == 0 {
				return fmt.Errorf("no gov v1 proposal messages found in %s", args[0])
			}

			serverCtx := server.GetServerContextFromCmd(cmd)
			home := serverCtx.Viper.GetString(flags.FlagHome)
			db, err := dbm.NewDB("application", server.GetAppDBBackend(serverCtx.Viper), filepath.Join(home, "data"))
			if err != nil {
				return err
			}
			defer db.Close()

			app := gaia.NewAgoricApp(
				ac.sender,
				ac.agdServer,
				serverCtx.Logger,
				db,
				nil,
				true,
				serverCtx.Viper,
				server.DefaultBaseappOptions(serverCtx.Viper)...,
			)

			ctx := app.NewUncachedContext(false, tmproto.Header{}).
				WithBlockHeight(app.LastBlockHeight())
			if err := simulateGovProposalMessages(ctx, msgs, app.MsgServiceRouter().Handler); err != nil {
				return err
			}

			cmd.Printf("simulated %d gov v1 proposal message(s) at height %d; no state changes written\n", len(msgs), app.LastBlockHeight())
			return nil
		},
	}
}

type govSimulationInput struct {
	Messages []json.RawMessage `json:"messages"`
	Body     *struct {
		Messages []json.RawMessage `json:"messages"`
	} `json:"body"`
}

type interfaceJSONCodec interface {
	UnmarshalInterfaceJSON(bz []byte, ptr interface{}) error
}

func readGovProposalSimulationMessages(cdc interfaceJSONCodec, path string) ([]sdk.Msg, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var input govSimulationInput
	if err := json.Unmarshal(contents, &input); err != nil {
		return nil, err
	}

	rawMsgs := input.Messages
	if len(rawMsgs) == 0 && input.Body != nil {
		rawMsgs = input.Body.Messages
	}

	msgs := make([]sdk.Msg, 0, len(rawMsgs))
	for i, rawMsg := range rawMsgs {
		var msg sdk.Msg
		if err := cdc.UnmarshalInterfaceJSON(rawMsg, &msg); err != nil {
			return nil, fmt.Errorf("decode message %d: %w", i, err)
		}

		if submitProposal, ok := msg.(*govv1.MsgSubmitProposal); ok {
			proposalMsgs, err := submitProposal.GetMsgs()
			if err != nil {
				return nil, fmt.Errorf("unpack MsgSubmitProposal message %d: %w", i, err)
			}
			msgs = append(msgs, proposalMsgs...)
			continue
		}

		msgs = append(msgs, msg)
	}

	return msgs, nil
}

func simulateGovProposalMessages(
	ctx sdk.Context,
	msgs []sdk.Msg,
	getHandler func(sdk.Msg) func(sdk.Context, sdk.Msg) (*sdk.Result, error),
) error {
	var failures []string
	proposalCacheCtx, _ := ctx.CacheContext()
	for i, msg := range msgs {
		msgType := sdk.MsgTypeURL(msg)
		handler := getHandler(msg)
		if handler == nil {
			failures = append(failures, fmt.Sprintf("- msg %d (%s) has no registered handler", i, msgType))
			continue
		}

		msgCacheCtx, writeMsgCache := proposalCacheCtx.CacheContext()
		if _, err := safeExecuteGovProposalSimulationMsg(msgCacheCtx, msg, handler); err != nil {
			failures = append(failures, fmt.Sprintf("- msg %d (%s) failed: %s", i, msgType, err))
			continue
		}
		writeMsgCache()
	}

	if len(failures) > 0 {
		return fmt.Errorf("gov proposal simulation failed with %d error(s):\n%s", len(failures), strings.Join(failures, "\n"))
	}
	return nil
}

func safeExecuteGovProposalSimulationMsg(ctx sdk.Context, msg sdk.Msg, handler func(sdk.Context, sdk.Msg) (*sdk.Result, error)) (res *sdk.Result, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("handling x/gov proposal msg [%s] panicked: %v", msg, r)
		}
	}()
	return handler(ctx, msg)
}
