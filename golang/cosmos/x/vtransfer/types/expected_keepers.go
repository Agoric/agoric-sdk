package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	clienttypes "github.com/cosmos/ibc-go/v10/modules/core/02-client/types"
	channel "github.com/cosmos/ibc-go/v10/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"
)

// ChannelKeeper defines the expected IBC channel keeper
type ChannelKeeper interface {
	GetChannel(ctx sdk.Context, srcPort, srcChan string) (channel channel.Channel, found bool)
	GetNextSequenceSend(ctx sdk.Context, portID, channelID string) (uint64, bool)
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
	ChanCloseInit(ctx sdk.Context, portID, channelID string) error
	TimeoutExecuted(ctx sdk.Context, packet channel.Packet) error
}
