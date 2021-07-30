package lien

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
)

var (
	NewKeeper               = keeper.NewKeeper
	NewWrappedAccountKeeper = types.NewWrappedAccountKeeper
)

type (
	Keeper = keeper.Keeper
)
