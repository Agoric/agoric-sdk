package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	clienttypes "github.com/cosmos/ibc-go/v7/modules/core/02-client/types"
	channel "github.com/cosmos/ibc-go/v7/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v7/modules/core/exported"
)

type BankKeeper interface {
	GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin
}

// ChannelKeeper defines the expected IBC channel keeper
type ChannelKeeper interface {
	GetAppVersion(ctx sdk.Context, portID, channelID string) (string, bool)
	GetChannel(ctx sdk.Context, srcPort, srcChan string) (channel channel.Channel, found bool)
	SendPacket(
		ctx sdk.Context,
		channelCap *capability.Capability,
		sourcePort string,
		sourceChannel string,
		timeoutHeight clienttypes.Height,
		timeoutTimestamp uint64,
		data []byte,
	) (uint64, error)
	WriteAcknowledgement(ctx sdk.Context, channelCap *capability.Capability, packet ibcexported.PacketI, acknowledgement ibcexported.Acknowledgement) error
	ChanOpenInit(ctx sdk.Context, order channel.Order, connectionHops []string, portID string,
		portCap *capability.Capability, counterparty channel.Counterparty, version string) (string, *capability.Capability, error)
	WriteOpenInitChannel(ctx sdk.Context, portID, channelID string, order channel.Order,
		connectionHops []string, counterparty channel.Counterparty, version string)
	WriteOpenTryChannel(ctx sdk.Context, portID, channelID string, order channel.Order,
		connectionHops []string, counterparty channel.Counterparty, version string)
	WriteOpenAckChannel(ctx sdk.Context, portID, channelID, counterpartyVersion, counterpartyChannelID string)
	ChanCloseInit(ctx sdk.Context, portID, channelID string, chanCap *capability.Capability) error
	TimeoutExecuted(ctx sdk.Context, channelCap *capability.Capability, packet ibcexported.PacketI) error
}

// ClientKeeper defines the expected IBC client keeper
type ClientKeeper interface {
	GetParams(ctx sdk.Context) clienttypes.Params
	SetParams(ctx sdk.Context, params clienttypes.Params)
}

// PortKeeper defines the expected IBC port keeper
type PortKeeper interface {
	BindPort(ctx sdk.Context, portID string) *capability.Capability
}

// ScopedKeeper defines the expected scoped capability keeper
type ScopedKeeper interface {
	ClaimCapability(ctx sdk.Context, cap *capability.Capability, name string) error
	GetCapability(ctx sdk.Context, name string) (*capability.Capability, bool)
}
