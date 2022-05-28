package vstorage

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
)

const (
	ModuleName = types.ModuleName
	StoreKey   = types.StoreKey
)

var (
	NewKeeper  = keeper.NewKeeper
	NewQuerier = keeper.NewQuerier
	NewStorage = types.NewData
	NewKeys    = types.NewKeys
)

type (
	Keeper = keeper.Keeper
	Data   = types.Data
)
