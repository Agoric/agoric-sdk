package types

import (
	agsdk "github.com/Agoric/agoric-sdk/golang/cosmos/types"
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
	return agsdk.CoinsEq(s.Total, other.Total) &&
		agsdk.CoinsEq(s.Bonded, other.Bonded) &&
		agsdk.CoinsEq(s.Unbonding, other.Unbonding) &&
		agsdk.CoinsEq(s.Locked, other.Locked) &&
		agsdk.CoinsEq(s.Liened, other.Liened)
}
