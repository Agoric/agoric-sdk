package app

import (
	"encoding/json"

	codecstd "github.com/cosmos/cosmos-sdk/std"
)

// GenesisState defines a type alias for the Agoric genesis application state.
type GenesisState map[string]json.RawMessage

// NewDefaultGenesisState generates the default state for the application.
func NewDefaultGenesisState() GenesisState {
	cdc := codecstd.MakeCodec(ModuleBasics)
	return ModuleBasics.DefaultGenesis(cdc)
}
