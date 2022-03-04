package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// AccountState represents the abstract state of an account.
// See ../spec/01_concepts.md for details.
type AccountState struct {
	Total     sdk.Coins `json:"total"`
	Bonded    sdk.Coins `json:"bonded"`
	Unbonding sdk.Coins `json:"unbonding"`
	Locked    sdk.Coins `json:"locked"`
	Liened    sdk.Coins `json:"liened"`
}

// IsEqual returns whether two AccountStates are equal.
// (Coins don't play nicely with equality (==) or reflect.DeepEqual().)
func (s AccountState) IsEqual(other AccountState) bool {
	return s.Total.IsEqual(other.Total) &&
		s.Bonded.IsEqual(other.Bonded) &&
		s.Unbonding.IsEqual(other.Unbonding) &&
		s.Locked.IsEqual(other.Locked) &&
		s.Liened.IsEqual(other.Liened)
}
