package swingset

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
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
	NewStorage           = types.NewStorage
	NewMailbox           = types.NewMailbox
	NewKeys              = types.NewKeys
	ModuleCdc            = types.ModuleCdc
	RegisterCodec        = types.RegisterCodec
)

type (
	Keeper            = keeper.Keeper
	Egress            = types.Egress
	MsgDeliverInbound = types.MsgDeliverInbound
	MsgProvision      = types.MsgProvision
	Storage           = types.Storage
)
