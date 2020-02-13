package appcodec

import (
	"encoding/json"

	appcodec "github.com/Agoric/cosmic-swingset/app/codec"
)

// GenesisState represents chain state at the start of the chain. Any initial state (account balances) are stored here.
type GenesisState map[string]json.RawMessage

func NewDefaultGenesisState() GenesisState {
	cdc := appcodec.MakeCodec(ModuleBasics)
	return ModuleBasics.DefaultGenesis()
}
