package swingset

import (
	"encoding/json"
	"time"

	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	abci "github.com/tendermint/tendermint/abci/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

type beginBlockAction struct {
	Type        string `json:"type"`
	StoragePort int    `json:"storagePort"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
	ChainID     string `json:"chainID"`
}

type endBlockAction struct {
	Type        string `json:"type"`
	StoragePort int    `json:"storagePort"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

type commitBlockAction struct {
	Type        string `json:"type"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func BeginBlock(ctx sdk.Context, req abci.RequestBeginBlock, keeper Keeper) error {
	defer telemetry.ModuleMeasureSince(types.ModuleName, time.Now(), telemetry.MetricKeyBeginBlocker)

	action := &beginBlockAction{
		Type:        "BEGIN_BLOCK",
		StoragePort: GetPort("storage"),
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
		ChainID:     ctx.ChainID(),
	}
	b, err := json.Marshal(action)
	if err != nil {
		return sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(ctx, string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	return err
}

var endBlockHeight int64
var endBlockTime int64

func EndBlock(ctx sdk.Context, req abci.RequestEndBlock, keeper Keeper) ([]abci.ValidatorUpdate, error) {
	defer telemetry.ModuleMeasureSince(types.ModuleName, time.Now(), telemetry.MetricKeyEndBlocker)
	action := &endBlockAction{
		Type:        "END_BLOCK",
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
		StoragePort: GetPort("storage"),
	}
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(ctx, string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		// NOTE: A failed END_BLOCK means that the SwingSet state is inconsistent.
		// Panic here, in the hopes that a replay from scratch will fix the problem.
		panic(err)
	}

	// Save our EndBlock status.
	endBlockHeight = ctx.BlockHeight()
	endBlockTime = ctx.BlockTime().Unix()

	return []abci.ValidatorUpdate{}, nil
}

func CommitBlock(keeper Keeper) error {
	defer telemetry.ModuleMeasureSince(types.ModuleName, time.Now(), "commit_blocker")

	action := &commitBlockAction{
		Type:        "COMMIT_BLOCK",
		BlockHeight: endBlockHeight,
		BlockTime:   endBlockTime,
	}
	committedHeight = endBlockHeight

	b, err := json.Marshal(action)
	if err != nil {
		return sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(sdk.Context{}, string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		// NOTE: A failed COMMIT_BLOCK means that the SwingSet state is inconsistent.
		// Panic here, in the hopes that a replay from scratch will fix the problem.
		panic(err)
	}
	return err
}
