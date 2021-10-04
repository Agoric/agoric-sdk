package lien

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
)

var (
	ModuleName              = types.ModuleName
	NewKeeper               = keeper.NewKeeper
	NewWrappedAccountKeeper = types.NewWrappedAccountKeeper
	StoreKey                = types.StoreKey
)

type (
	Keeper = keeper.Keeper
)
