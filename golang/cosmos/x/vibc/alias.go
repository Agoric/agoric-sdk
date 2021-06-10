package vibc

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
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
