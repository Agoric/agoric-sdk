package vlocalchain

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
)

const (
	ModuleName = types.ModuleName
	StoreKey   = types.StoreKey
)

var (
	NewKeeper = keeper.NewKeeper
)

type (
	Keeper = keeper.Keeper
)
