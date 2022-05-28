package swingset

import (
	// "fmt"

	"fmt"
	stdlog "log"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Params: types.Params{},
	}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("swingset genesis data cannot be nil")
	}
	if err := data.Params.ValidateBasic(); err != nil {
		return err
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Params: types.DefaultParams(),
	}
}

type bootstrapBlockAction struct {
	Type        string `json:"type"`
	BlockTime   int64  `json:"blockTime"`
	StoragePort int    `json:"storagePort"`
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	keeper.SetParams(ctx, data.GetParams())

	// Just run the SwingSet kernel to finish bootstrap and get ready to open for
	// business.
	stdlog.Println("Running SwingSet until bootstrap is ready")
	action := &bootstrapBlockAction{
		Type:        "BOOTSTRAP_BLOCK",
		BlockTime:   ctx.BlockTime().Unix(),
		StoragePort: vm.GetPort("vstorage"),
	}

	_, err := keeper.BlockingSend(ctx, action)

	if err != nil {
		// NOTE: A failed BOOTSTRAP_BLOCK means that the SwingSet state is inconsistent.
		// Panic here, in the hopes that a replay from scratch will fix the problem.
		panic(err)
	}

	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Params = k.GetParams(ctx)
	return gs
}
