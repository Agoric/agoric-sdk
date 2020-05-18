package swingset

import (
	"github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/keeper"
	"github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/types"
)

const (
	ModuleName = types.ModuleName
	RouterKey  = types.RouterKey
	StoreKey   = types.StoreKey
)

var (
	NewKeeper            = keeper.NewKeeper
	NewQuerier           = keeper.NewQuerier
	NewMsgDeliverInbound = types.NewMsgDeliverInbound
	NewMsgProvision      = types.NewMsgProvision
	NewMsgSendPacket     = types.NewMsgSendPacket
	NewStorage           = types.NewStorage
	NewMailbox           = types.NewMailbox
	NewKeys              = types.NewKeys
	ModuleCdc            = types.ModuleCdc
	RegisterCodec        = types.RegisterCodec
)

type (
	Keeper            = keeper.Keeper
	MsgDeliverInbound = types.MsgDeliverInbound
	MsgProvision      = types.MsgProvision
	MsgSendPacket     = types.MsgSendPacket
	QueryResStorage   = types.QueryResStorage
	QueryResKeys      = types.QueryResKeys
	Storage           = types.Storage
)
