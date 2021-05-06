package vpurse

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"
)

const (
	ModuleName = types.ModuleName
	RouterKey  = types.RouterKey
	StoreKey   = types.StoreKey
)

var (
	NewKeeper     = keeper.NewKeeper
	ModuleCdc     = types.ModuleCdc
	RegisterCodec = types.RegisterCodec
)

type (
	Keeper = keeper.Keeper
)
