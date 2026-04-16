package keeper

import (
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	clienttypes "github.com/cosmos/ibc-go/v10/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v10/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v10/modules/core/05-port/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"

	agtypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
)

var (
	_ porttypes.ICS4Wrapper = Keeper{}
	_ types.IBCModuleImpl   = Keeper{}
	_ types.ReceiverImpl    = Keeper{}
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	cdc codec.Codec

	channelKeeper types.ChannelKeeper
	clientKeeper  types.ClientKeeper

	// Filled out by `WithScope`
	scope *DynamicPortScope
}

// NewKeeper creates a new vibc Keeper instance
func NewKeeper(
	cdc codec.Codec,
	channelKeeper types.ChannelKeeper,
	clientKeeper types.ClientKeeper,
) Keeper {

	return Keeper{
		cdc:           cdc,
		channelKeeper: channelKeeper,
		clientKeeper:  clientKeeper,
	}
}

// WithScope returns a new Keeper copied from the receiver, but with the given
// dynamic port scope.
func (k Keeper) WithScope(scope *DynamicPortScope) Keeper {
	k.scope = scope
	return k
}

// PushAction sends a vm.Action to the VM controller.
func (k Keeper) PushAction(ctx sdk.Context, action vm.Action) error {
	return k.scope.PushAction(ctx, action)
}

// GetICS4Wrapper returns the ICS4Wrapper interface for the keeper.
func (k Keeper) GetICS4Wrapper() porttypes.ICS4Wrapper {
	return k
}

// GetAppVersion defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) GetAppVersion(ctx sdk.Context, portID, channelID string) (string, bool) {
	return k.channelKeeper.GetAppVersion(ctx, portID, channelID)
}

// GetChannel defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) GetChannel(ctx sdk.Context, portID, channelID string) (channeltypes.Channel, bool) {
	return k.channelKeeper.GetChannel(ctx, portID, channelID)
}

// ReceiveChanOpenInit wraps the keeper's ChanOpenInit function.
func (k Keeper) ReceiveChanOpenInit(ctx sdk.Context, order channeltypes.Order, connectionHops []string,
	portID, rPortID, version string,
) error {
	counterparty := channeltypes.Counterparty{
		PortId: rPortID,
	}
	channelID, err := k.channelKeeper.ChanOpenInit(ctx, order, connectionHops, portID, counterparty, version)
	if err != nil {
		return err
	}

	k.channelKeeper.WriteOpenInitChannel(ctx, portID, channelID, order, connectionHops, counterparty, version)
	return nil
}

// ReceiveSendPacket wraps the keeper's SendPacket function.
func (k Keeper) ReceiveSendPacket(ctx sdk.Context, packet ibcexported.PacketI) (uint64, error) {
	sourcePort := packet.GetSourcePort()
	sourceChannel := packet.GetSourceChannel()
	timeoutHeight := clienttypes.MustParseHeight(packet.GetTimeoutHeight().String())
	timeoutTimestamp := packet.GetTimeoutTimestamp()
	data := packet.GetData()

	return k.SendPacket(ctx, sourcePort, sourceChannel, timeoutHeight, timeoutTimestamp, data)
}

// SendPacket defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) SendPacket(
	ctx sdk.Context,
	sourcePort string,
	sourceChannel string,
	timeoutHeight clienttypes.Height,
	timeoutTimestamp uint64,
	data []byte,
) (uint64, error) {
	return k.channelKeeper.SendPacket(ctx, sourcePort, sourceChannel, timeoutHeight, timeoutTimestamp, data)
}

// ReceiveWriteAcknowledgement wraps the keeper's WriteAcknowledgment function.
func (k Keeper) ReceiveWriteAcknowledgement(ctx sdk.Context, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) error {
	return k.WriteAcknowledgement(ctx, packet, ack)
}

// WriteAcknowledgement defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) WriteAcknowledgement(ctx sdk.Context, packet ibcexported.PacketI, ack ibcexported.Acknowledgement) error {
	channelPacket := agtypes.CopyToChannelPacket(packet)
	return k.channelKeeper.WriteAcknowledgement(ctx, channelPacket, ack)
}

// ReceiveWriteOpenTryChannel wraps the keeper's WriteOpenTryChannel function.
func (k Keeper) ReceiveWriteOpenTryChannel(ctx sdk.Context, packet ibcexported.PacketI, order channeltypes.Order, connectionHops []string, version string) error {
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	counterparty := channeltypes.NewCounterparty(packet.GetSourcePort(), packet.GetSourceChannel())
	k.WriteOpenTryChannel(ctx, portID, channelID, order, connectionHops, counterparty, version)
	return nil
}

// WriteOpenTryChannel is a wrapper function for the channel Keeper's function
func (k Keeper) WriteOpenTryChannel(ctx sdk.Context, portID, channelID string, order channeltypes.Order,
	connectionHops []string, counterparty channeltypes.Counterparty, version string) {
	k.channelKeeper.WriteOpenTryChannel(ctx, portID, channelID, order, connectionHops, counterparty, version)
}

// ReceiveChanCloseInit is a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) ReceiveChanCloseInit(ctx sdk.Context, portID, channelID string) error {
	err := k.channelKeeper.ChanCloseInit(ctx, portID, channelID)
	if err != nil {
		return err
	}
	return nil
}

// ReceiveBindPort is a wrapper function for the port Keeper's function in order
// to expose it to the vibc IBC handler.
func (k Keeper) ReceiveBindPort(ctx sdk.Context, portID string) error {
	return k.BindPort(ctx, portID)
}

// BindPort dynamically binds an exact port ID to the vibc IBC module.
func (k Keeper) BindPort(ctx sdk.Context, portID string) error {
	return k.scope.BindPort(ctx, portID)
}

// RevokePort removes a previously dynamic exact port binding.
func (k Keeper) RevokePort(ctx sdk.Context, portID string) error {
	return k.scope.RevokePort(ctx, portID)
}

// LoadDynamicPortBindings rehydrates persisted dynamic bindings into the live router.
func (k Keeper) LoadDynamicPortBindings(ctx sdk.Context) error {
	return k.scope.LoadBindings(ctx)
}

// ReceiveTimeoutExecuted is a wrapper function for the channel Keeper's
// function in order to expose it to the vibc IBC handler.
func (k Keeper) ReceiveTimeoutExecuted(ctx sdk.Context, packet ibcexported.PacketI) error {
	return k.TimeoutExecuted(ctx, packet)
}

// TimeoutExecuted defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) TimeoutExecuted(ctx sdk.Context, packet ibcexported.PacketI) error {
	channelPacket := agtypes.CopyToChannelPacket(packet)
	return k.channelKeeper.TimeoutExecuted(ctx, channelPacket)
}
