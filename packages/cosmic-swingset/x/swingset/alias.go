package swingset

import (
	"github.com/Agoric/cosmic-swingset/x/swingset/internal/keeper"
	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
)

const (
	ModuleName = types.ModuleName
	RouterKey  = types.RouterKey
	StoreKey   = types.StoreKey
)

var (
	NewKeeper        = keeper.NewKeeper
	NewQuerier       = keeper.NewQuerier
	NewMsgDeliverInbound = types.NewMsgDeliverInbound
	NewStorage       = types.NewStorage
	NewMailbox       = types.NewMailbox
	NewKeys          = types.NewKeys
	ModuleCdc        = types.ModuleCdc
	RegisterCodec    = types.RegisterCodec
)

type (
	Keeper          = keeper.Keeper
	MsgDeliverInbound = types.MsgDeliverInbound
	QueryResStorage = types.QueryResStorage
	QueryResKeys    = types.QueryResKeys
	Storage         = types.Storage
)
