package loc

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"
)

var (
	ModuleName = types.ModuleName
	NewKeeper  = keeper.NewKeeper
	StoreKey   = types.StoreKey
)

type (
	Keeper = keeper.Keeper
)
