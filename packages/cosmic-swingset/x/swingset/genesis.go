package swingset

import (
	// "fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

type GenesisState struct {
	// TODO: Provisioning records
	PubKeys []string `json:"swingset_pubkeys"`
}

func NewGenesisState() GenesisState {
	return GenesisState{
		PubKeys: []string{},
	}
}

func ValidateGenesis(data GenesisState) error {
	return nil
}

func DefaultGenesisState() GenesisState {
	return GenesisState{
		PubKeys: []string{},
	}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data GenesisState) []abci.ValidatorUpdate {
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) GenesisState {
	// TODO: Preserve the SwingSet transcript
	return GenesisState{
		PubKeys: []string{},
	}
}
