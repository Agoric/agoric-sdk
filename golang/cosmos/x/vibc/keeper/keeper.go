package keeper

import (
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	capabilitykeeper "github.com/cosmos/cosmos-sdk/x/capability/keeper"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v2/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v2/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v2/modules/core/24-host"
	ibcexported "github.com/cosmos/ibc-go/v2/modules/core/exported"

	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      codec.Codec

	channelKeeper types.ChannelKeeper
	portKeeper    types.PortKeeper
	scopedKeeper  capabilitykeeper.ScopedKeeper
	bankKeeper    bankkeeper.Keeper

	// CallToController dispatches a message to the controlling process
	CallToController func(ctx sdk.Context, str string) (string, error)
}

// NewKeeper creates a new dIBC Keeper instance
func NewKeeper(
	cdc codec.Codec, key sdk.StoreKey,
	channelKeeper types.ChannelKeeper, portKeeper types.PortKeeper,
	bankKeeper bankkeeper.Keeper,
	scopedKeeper capabilitykeeper.ScopedKeeper,
	callToController func(ctx sdk.Context, str string) (string, error),
) Keeper {

	return Keeper{
		storeKey:         key,
		cdc:              cdc,
		bankKeeper:       bankKeeper,
		channelKeeper:    channelKeeper,
		portKeeper:       portKeeper,
		scopedKeeper:     scopedKeeper,
		CallToController: callToController,
	}
}

func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

// GetNextSequenceSend defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) GetNextSequenceSend(ctx sdk.Context, portID, channelID string) (uint64, bool) {
	return k.channelKeeper.GetNextSequenceSend(ctx, portID, channelID)
}

// GetChannel defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) GetChannel(ctx sdk.Context, portID, channelID string) (channeltypes.Channel, bool) {
	return k.channelKeeper.GetChannel(ctx, portID, channelID)
}

// ChanOpenInit defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) ChanOpenInit(ctx sdk.Context, order channeltypes.Order, connectionHops []string,
	portID, rPortID, version string,
) error {
	capName := host.PortPath(portID)
	portCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(porttypes.ErrInvalidPort, "could not retrieve port capability at: %s", capName)
	}
	counterparty := channeltypes.Counterparty{
		PortId: rPortID,
	}
	channelID, chanCap, err := k.channelKeeper.ChanOpenInit(ctx, order, connectionHops, portID, portCap, counterparty, version)
	if err != nil {
		return err
	}
	chanCapName := host.ChannelCapabilityPath(portID, channelID)
	err = k.ClaimCapability(ctx, chanCap, chanCapName)
	if err != nil {
		return err
	}

	// We need to emit a channel event to notify the relayer.
	ctx.EventManager().EmitEvents(sdk.Events{
		sdk.NewEvent(
			sdk.EventTypeMessage,
			sdk.NewAttribute(sdk.AttributeKeyModule, channeltypes.AttributeValueCategory),
		),
	})
	return nil
}

// SendPacket defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) SendPacket(ctx sdk.Context, packet ibcexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.SendPacket(ctx, chanCap, packet)
}

// WriteAcknowledgement defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) WriteAcknowledgement(ctx sdk.Context, packet ibcexported.PacketI, acknowledgement []byte) error {
	portID := packet.GetDestPort()
	channelID := packet.GetDestChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.WriteAcknowledgement(ctx, chanCap, packet, acknowledgement)
}

// ChanCloseInit defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) ChanCloseInit(ctx sdk.Context, portID, channelID string) error {
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	err := k.channelKeeper.ChanCloseInit(ctx, portID, channelID, chanCap)
	if err != nil {
		return err
	}

	// We need to emit a channel event to notify the relayer.
	ctx.EventManager().EmitEvents(sdk.Events{
		sdk.NewEvent(
			sdk.EventTypeMessage,
			sdk.NewAttribute(sdk.AttributeKeyModule, channeltypes.AttributeValueCategory),
		),
	})
	return nil
}

// BindPort defines a wrapper function for the port Keeper's function in
// order to expose it to the vibc IBC handler.
func (k Keeper) BindPort(ctx sdk.Context, portID string) error {
	cap := k.portKeeper.BindPort(ctx, portID)
	return k.ClaimCapability(ctx, cap, host.PortPath(portID))
}

// TimeoutExecuted defines a wrapper function for the channel Keeper's function
// in order to expose it to the vibc IBC handler.
func (k Keeper) TimeoutExecuted(ctx sdk.Context, packet ibcexported.PacketI) error {
	portID := packet.GetSourcePort()
	channelID := packet.GetSourceChannel()
	capName := host.ChannelCapabilityPath(portID, channelID)
	chanCap, ok := k.GetCapability(ctx, capName)
	if !ok {
		return sdkerrors.Wrapf(channeltypes.ErrChannelCapabilityNotFound, "could not retrieve channel capability at: %s", capName)
	}
	return k.channelKeeper.TimeoutExecuted(ctx, chanCap, packet)
}

// ClaimCapability allows the vibc module to claim a capability that IBC module
// passes to it
func (k Keeper) ClaimCapability(ctx sdk.Context, cap *capability.Capability, name string) error {
	return k.scopedKeeper.ClaimCapability(ctx, cap, name)
}

func (k Keeper) GetCapability(ctx sdk.Context, name string) (*capability.Capability, bool) {
	return k.scopedKeeper.GetCapability(ctx, name)
}
