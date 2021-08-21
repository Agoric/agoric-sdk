package swingset

import (
	// "fmt"
	"encoding/json"
	stdlog "log"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Storage: make(map[string]string),
	}
}

func ValidateGenesis(data *types.GenesisState) error {
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	gs := NewGenesisState()
	return gs
}

type bootstrapBlockAction struct {
	Type        string `json:"type"`
	BlockTime   int64  `json:"blockTime"`
	StoragePort int    `json:"storagePort"`
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	// NONDETERMINISM: order of SetStorage is not deterministic
	var storage types.Storage
	for key, value := range data.Storage {
		storage.Value = value
		keeper.SetStorage(ctx, key, &storage)
	}

	// Just run the SwingSet kernel to finish bootstrap and get ready to open for
	// business.
	stdlog.Println("Running SwingSet until bootstrap is ready")
	action := &bootstrapBlockAction{
		Type:        "BOOTSTRAP_BLOCK",
		BlockTime:   ctx.BlockTime().Unix(),
		StoragePort: vm.GetPort("storage"),
	}
	b, err := json.Marshal(action)
	if err != nil {
		panic(err)
	}

	_, err = keeper.CallToController(ctx, string(b))

	if err != nil {
		// NOTE: A failed BOOTSTRAP_BLOCK means that the SwingSet state is inconsistent.
		// Panic here, in the hopes that a replay from scratch will fix the problem.
		panic(err)
	}

	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Storage = k.ExportStorage(ctx)
	return gs
}
