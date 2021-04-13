package swingset

import (
	// "fmt"
	stdlog "log"

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

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	var storage types.Storage
	for key, value := range data.Storage {
		storage.Value = value
		keeper.SetStorage(ctx, key, &storage)
	}

	// Just run the SwingSet kernel to finish bootstrap and get ready to open for
	// business.
	stdlog.Println("Running SwingSet until bootstrap is ready")
	bootstrapBlock := abci.RequestEndBlock{Height: ctx.BlockHeight()}
	valUpdate, err := EndBlock(ctx, bootstrapBlock, keeper)
	if err != nil {
		// Errors here are fatal.
		panic(err)
	}
	return valUpdate
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Storage = k.ExportStorage(ctx)
	return gs
}
