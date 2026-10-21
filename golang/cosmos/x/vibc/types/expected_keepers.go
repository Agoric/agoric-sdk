package types

import (
	context "context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	clienttypes "github.com/cosmos/ibc-go/v10/modules/core/02-client/types"
	channel "github.com/cosmos/ibc-go/v10/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"
)

type BankKeeper interface {
	GetBalance(ctx context.Context, addr sdk.AccAddress, denom string) sdk.Coin
}

// ChannelKeeper defines the expected IBC channel keeper
type ChannelKeeper interface {
	GetAppVersion(ctx sdk.Context, portID, channelID string) (string, bool)
	GetChannel(ctx sdk.Context, srcPort, srcChan string) (channel channel.Channel, found bool)
	SendPacket(
		ctx sdk.Context,
		sourcePort string,
		sourceChannel string,
		timeoutHeight clienttypes.Height,
		timeoutTimestamp uint64,
		data []byte,
	) (uint64, error)
	WriteAcknowledgement(ctx sdk.Context, packet ibcexported.PacketI, acknowledgement ibcexported.Acknowledgement) error
	ChanOpenInit(ctx sdk.Context, order channel.Order, connectionHops []string, portID string,
		counterparty channel.Counterparty, version string) (string, error)
	WriteOpenInitChannel(ctx sdk.Context, portID, channelID string, order channel.Order,
		connectionHops []string, counterparty channel.Counterparty, version string)
	WriteOpenTryChannel(ctx sdk.Context, portID, channelID string, order channel.Order,
		connectionHops []string, counterparty channel.Counterparty, version string)
	WriteOpenAckChannel(ctx sdk.Context, portID, channelID, counterpartyVersion, counterpartyChannelID string)
	ChanCloseInit(ctx sdk.Context, portID, channelID string) error
	TimeoutExecuted(ctx sdk.Context, packet channel.Packet) error
}

// ClientKeeper defines the expected IBC client keeper
type ClientKeeper interface {
	GetParams(ctx sdk.Context) clienttypes.Params
	SetParams(ctx sdk.Context, params clienttypes.Params)
}
