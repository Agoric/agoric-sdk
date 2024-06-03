package vtransfer

import (
	"testing"
)

func TestDefaultGenesis(t *testing.T) {
	defaultGenesisState := DefaultGenesisState()
	if err := ValidateGenesis(defaultGenesisState); err != nil {
		t.Errorf("DefaultGenesisState did not validate %v: %e", defaultGenesisState, err)
	}
}
