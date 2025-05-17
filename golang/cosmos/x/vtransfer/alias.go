package vtransfer

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/types"
)

const (
	ModuleName = types.ModuleName
	StoreKey   = types.StoreKey
)

type Keeper = keeper.Keeper
