package dibc

import (
	"github.com/Agoric/cosmic-swingset/x/dibc/keeper"
	"github.com/Agoric/cosmic-swingset/x/dibc/types"
)

const (
	ModuleName = types.ModuleName
	RouterKey  = types.RouterKey
	StoreKey   = types.StoreKey
)

var (
	NewKeeper        = keeper.NewKeeper
	NewMsgSendPacket = types.NewMsgSendPacket
	ModuleCdc        = types.ModuleCdc
	RegisterCodec    = types.RegisterCodec
)

type (
	Keeper        = keeper.Keeper
	MsgSendPacket = types.MsgSendPacket
)
