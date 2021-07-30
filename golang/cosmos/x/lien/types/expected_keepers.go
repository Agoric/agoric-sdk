package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	stakingTypes "github.com/cosmos/cosmos-sdk/x/staking/types"
)

type BankKeeper interface {
	GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	//GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coins
}

type StakingKeeper interface {
	GetDelegatorDelegations(ctx sdk.Context, delegator sdk.AccAddress, maxRetrieve uint16) []stakingTypes.Delegation
	GetUnbondingDelegations(ctx sdk.Context, delegator sdk.AccAddress, maxRetrieve uint16) []stakingTypes.UnbondingDelegation
	GetValidator(ctx sdk.Context, addr sdk.ValAddress) (stakingTypes.Validator, bool)
}
