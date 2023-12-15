package types

import (
	sdkioerrors "cosmossdk.io/errors"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v6/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v6/modules/core/24-host"
	ibckeeper "github.com/cosmos/ibc-go/v6/modules/core/keeper"

	"github.com/cosmos/ibc-go/v6/modules/core/exported"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// AsyncVersions is a flag that indicates whether the IBC module supports
	// asynchronous versions.  If it does, then the VM must supply an empty
	// version string to indicate that the VM explicitly (possibly async)
	// performs the Write* method.
	AsyncVersions = ibckeeper.AsyncVersionNegotiation
)

var (
	_ porttypes.IBCModule = (*IBCModule)(nil)
)

type IBCModuleImpl interface {
	ClaimCapability(ctx sdk.Context, channelCap *capability.Capability, path string) error
	GetChannel(ctx sdk.Context, portID, channelID string) (channeltypes.Channel, bool)
	PushAction(ctx sdk.Context, action vm.Action) error
}

type IBCModule struct {
	impl IBCModuleImpl
}

func NewIBCModule(impl IBCModuleImpl) IBCModule {
	return IBCModule{
		impl: impl,
	}
}

type channelOpenInitEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string                    `json:"event" default:"channelOpenInit"`
	Order            string                    `json:"order"`
	ConnectionHops   []string                  `json:"connectionHops"`
	PortID           string                    `json:"portID"`
	ChannelID        string                    `json:"channelID"`
	Counterparty     channeltypes.Counterparty `json:"counterparty"`
	Version          string                    `json:"version"`
	AsyncVersions    bool                      `json:"asyncVersions"`
}

// Implement IBCModule callbacks
func (im IBCModule) OnChanOpenInit(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	version string,
) (string, error) {
	event := channelOpenInitEvent{
		Order:          orderToString(order),
		ConnectionHops: connectionHops,
		PortID:         portID,
		ChannelID:      channelID,
		Counterparty:   counterparty,
		Version:        version,
		AsyncVersions:  AsyncVersions,
	}

	err := im.impl.PushAction(ctx, event)
	if err != nil {
		return "", err
	}

	// Claim channel capability passed back by IBC module
	if err := im.impl.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
		return "", err
	}

	if !event.AsyncVersions {
		// We have to supply a synchronous version, so just echo back the one they sent.
		return event.Version, nil
	}

	return "", nil
}

type channelOpenTryEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string                    `json:"event" default:"channelOpenTry"`
	Order            string                    `json:"order"`
	ConnectionHops   []string                  `json:"connectionHops"`
	PortID           string                    `json:"portID"`
	ChannelID        string                    `json:"channelID"`
	Counterparty     channeltypes.Counterparty `json:"counterparty"`
	Version          string                    `json:"version"`
	AsyncVersions    bool                      `json:"asyncVersions"`
}

func (im IBCModule) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	counterpartyVersion string,
) (string, error) {
	event := channelOpenTryEvent{
		Order:          orderToString(order),
		ConnectionHops: connectionHops,
		PortID:         portID,
		ChannelID:      channelID,
		Counterparty:   counterparty,
		Version:        counterpartyVersion,
		AsyncVersions:  AsyncVersions,
	}

	err := im.impl.PushAction(ctx, event)
	if err != nil {
		return "", err
	}

	// Claim channel capability passed back by IBC module
	if err = im.impl.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
		return "", sdkioerrors.Wrap(channeltypes.ErrChannelCapabilityNotFound, err.Error())
	}

	if !event.AsyncVersions {
		// We have to supply a synchronous version, so just echo back the one they sent.
		return event.Version, nil
	}

	// Use an empty version string to indicate that the VM explicitly (possibly
	// async) performs the WriteOpenTryChannel.
	return "", nil
}

type channelOpenAckEvent struct {
	*vm.ActionHeader    `actionType:"IBC_EVENT"`
	Event               string                    `json:"event" default:"channelOpenAck"`
	PortID              string                    `json:"portID"`
	ChannelID           string                    `json:"channelID"`
	CounterpartyVersion string                    `json:"counterpartyVersion"`
	Counterparty        channeltypes.Counterparty `json:"counterparty"`
	ConnectionHops      []string                  `json:"connectionHops"`
}

func (im IBCModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyChannelID string,
	counterpartyVersion string,
) error {
	// We don't care if the channel was found.  If it wasn't then GetChannel
	// returns an empty channel object that we can still use without crashing.
	channel, _ := im.impl.GetChannel(ctx, portID, channelID)

	channel.Counterparty.ChannelId = counterpartyChannelID
	event := channelOpenAckEvent{
		PortID:              portID,
		ChannelID:           channelID,
		CounterpartyVersion: counterpartyVersion,
		Counterparty:        channel.Counterparty,
		ConnectionHops:      channel.ConnectionHops,
	}

	return im.impl.PushAction(ctx, event)
}

type channelOpenConfirmEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string `json:"event" default:"channelOpenConfirm"`
	PortID           string `json:"portID"`
	ChannelID        string `json:"channelID"`
}

func (im IBCModule) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelOpenConfirmEvent{
		PortID:    portID,
		ChannelID: channelID,
	}

	return im.impl.PushAction(ctx, event)
}

type channelCloseInitEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string `json:"event" default:"channelCloseInit"`
	PortID           string `json:"portID"`
	ChannelID        string `json:"channelID"`
}

func (im IBCModule) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseInitEvent{
		PortID:    portID,
		ChannelID: channelID,
	}

	err := im.impl.PushAction(ctx, event)
	return err
}

type channelCloseConfirmEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string `json:"event" default:"channelCloseConfirm"`
	PortID           string `json:"portID"`
	ChannelID        string `json:"channelID"`
}

func (im IBCModule) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseConfirmEvent{
		PortID:    portID,
		ChannelID: channelID,
	}

	err := im.impl.PushAction(ctx, event)
	return err
}

type receivePacketEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string              `json:"event" default:"receivePacket"`
	Packet           channeltypes.Packet `json:"packet"`
	Relayer          sdk.AccAddress      `json:"relayer"`
}

func (im IBCModule) OnRecvPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) exported.Acknowledgement {
	// Sometimes we receive duplicate packets, just with a
	// missing packet.TimeoutTimestamp.  This causes duplicate
	// acks, with one of them being rejected.
	//
	// This turns out to happen when you run both "rly start"
	// and also "rly tx xfer"-- they both are trying to relay
	// the same packets.

	event := receivePacketEvent{
		Packet:  packet,
		Relayer: relayer,
	}

	err := im.impl.PushAction(ctx, event)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(err)
	}

	return nil
}

type acknowledgementPacketEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string              `json:"event" default:"acknowledgementPacket"`
	Packet           channeltypes.Packet `json:"packet"`
	Acknowledgement  []byte              `json:"acknowledgement"`
	Relayer          sdk.AccAddress      `json:"relayer"`
}

func (im IBCModule) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	event := acknowledgementPacketEvent{
		Packet:          packet,
		Acknowledgement: acknowledgement,
		Relayer:         relayer,
	}

	err := im.impl.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}

type timeoutPacketEvent struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string              `json:"event" default:"timeoutPacket"`
	Packet           channeltypes.Packet `json:"packet"`
	Relayer          sdk.AccAddress      `json:"relayer"`
}

func (im IBCModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	event := timeoutPacketEvent{
		Packet:  packet,
		Relayer: relayer,
	}

	err := im.impl.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}
