package vibc

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v4/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v4/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v4/modules/core/24-host"

	"github.com/cosmos/ibc-go/v4/modules/core/exported"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	_ porttypes.IBCModule = IBCModule{}
)

type IBCModule struct {
	keeper Keeper
}

type portMessage struct { // comes from swingset's IBC handler
	Type              string              `json:"type"` // IBC_METHOD
	Method            string              `json:"method"`
	Packet            channeltypes.Packet `json:"packet"`
	RelativeTimeoutNs uint64              `json:"relativeTimeoutNs,string"`
	Order             string              `json:"order"`
	Hops              []string            `json:"hops"`
	Version           string              `json:"version"`
	Ack               []byte              `json:"ack"`
}

func stringToOrder(order string) channeltypes.Order {
	switch order {
	case "ORDERED":
		return channeltypes.ORDERED
	case "UNORDERED":
		return channeltypes.UNORDERED
	default:
		return channeltypes.NONE
	}
}

func orderToString(order channeltypes.Order) string {
	switch order {
	case channeltypes.ORDERED:
		return "ORDERED"
	case channeltypes.UNORDERED:
		return "UNORDERED"
	default:
		return "NONE"
	}
}

func NewIBCModule(keeper Keeper) IBCModule {
	return IBCModule{
		keeper: keeper,
	}
}

func (ch IBCModule) Receive(cctx context.Context, str string) (ret string, err error) {
	// fmt.Println("ibc.go downcall", str)
	ctx := sdk.UnwrapSDKContext(cctx)
	keeper := ch.keeper

	msg := new(portMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return ret, err
	}

	if msg.Type != "IBC_METHOD" {
		return "", fmt.Errorf(`channel handler only accepts messages of "type": "IBC_METHOD"`)
	}

	switch msg.Method {
	case "sendPacket":
		seq, ok := keeper.GetNextSequenceSend(
			ctx,
			msg.Packet.SourcePort,
			msg.Packet.SourceChannel,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		timeoutTimestamp := msg.Packet.TimeoutTimestamp
		if msg.Packet.TimeoutHeight.IsZero() && msg.Packet.TimeoutTimestamp == 0 {
			// Use the relative timeout if no absolute timeout is specifiied.
			timeoutTimestamp = uint64(ctx.BlockTime().UnixNano()) + msg.RelativeTimeoutNs
		}

		packet := channeltypes.NewPacket(
			msg.Packet.Data, seq,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			msg.Packet.TimeoutHeight, timeoutTimestamp,
		)
		err = keeper.SendPacket(ctx, packet)
		if err == nil {
			bytes, err := json.Marshal(&packet)
			if err == nil {
				ret = string(bytes)
			}
		}

	case "receiveExecuted":
		err = keeper.WriteAcknowledgement(ctx, msg.Packet, msg.Ack)
		if err == nil {
			ret = "true"
		}

	case "startChannelOpenInit":
		err = keeper.ChanOpenInit(
			ctx, stringToOrder(msg.Order), msg.Hops,
			msg.Packet.SourcePort,
			msg.Packet.DestinationPort,
			msg.Version,
		)
		if err == nil {
			ret = "true"
		}

	case "startChannelCloseInit":
		err = keeper.ChanCloseInit(ctx, msg.Packet.SourcePort, msg.Packet.SourceChannel)
		if err == nil {
			ret = "true"
		}

	case "bindPort":
		err = keeper.BindPort(ctx, msg.Packet.SourcePort)
		if err == nil {
			ret = "true"
		}

	case "timeoutExecuted":
		err = keeper.TimeoutExecuted(ctx, msg.Packet)
		if err == nil {
			ret = "true"
		}

	default:
		err = fmt.Errorf("unrecognized method %s", msg.Method)
	}

	// fmt.Println("ibc.go downcall reply", ret, err)
	return
}

func (im IBCModule) PushAction(ctx sdk.Context, action vm.Action) error {
	// fmt.Println("ibc.go upcall", send)
	return im.keeper.PushAction(ctx, action)
	// fmt.Println("ibc.go upcall reply", reply, err)
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
	return "", sdkerrors.Wrap(
		channeltypes.ErrChannelNotFound,
		fmt.Sprintf("vibc does not allow synthetic channelOpenInit for port %s", portID),
	)
}

type channelOpenTryEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string                    `json:"event" default:"channelOpenTry"`
	Order           string                    `json:"order"`
	ConnectionHops  []string                  `json:"connectionHops"`
	PortID          string                    `json:"portID"`
	ChannelID       string                    `json:"channelID"`
	Counterparty    channeltypes.Counterparty `json:"counterparty"`
	Version         string                    `json:"version"`
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
		Version:        counterpartyVersion, // TODO: don't just use the counterparty version
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return "", err
	}

	// Claim channel capability passed back by IBC module
	if err = im.keeper.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
		return "", sdkerrors.Wrap(channeltypes.ErrChannelCapabilityNotFound, err.Error())
	}

	return event.Version, err
}

type channelOpenAckEvent struct {
	vm.ActionHeader     `actionType:"IBC_EVENT"`
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
	channel, _ := im.keeper.GetChannel(ctx, portID, channelID)

	channel.Counterparty.ChannelId = counterpartyChannelID
	event := channelOpenAckEvent{
		PortID:              portID,
		ChannelID:           channelID,
		CounterpartyVersion: counterpartyVersion,
		Counterparty:        channel.Counterparty,
		ConnectionHops:      channel.ConnectionHops,
	}

	return im.PushAction(ctx, event)
}

type channelOpenConfirmEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string `json:"event" default:"channelOpenConfirm"`
	PortID          string `json:"portID"`
	ChannelID       string `json:"channelID"`
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

	return im.PushAction(ctx, event)
}

type channelCloseInitEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string `json:"event" default:"channelCloseInit"`
	PortID          string `json:"portID"`
	ChannelID       string `json:"channelID"`
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

	err := im.PushAction(ctx, event)
	return err
}

type channelCloseConfirmEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string `json:"event" default:"channelCloseConfirm"`
	PortID          string `json:"portID"`
	ChannelID       string `json:"channelID"`
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

	err := im.PushAction(ctx, event)
	return err
}

type receivePacketEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string              `json:"event" default:"receivePacket"`
	Packet          channeltypes.Packet `json:"packet"`
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
		Packet: packet,
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(err)
	}

	return nil
}

type acknowledgementPacketEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string              `json:"event" default:"acknowledgementPacket"`
	Packet          channeltypes.Packet `json:"packet"`
	Acknowledgement []byte              `json:"acknowledgement"`
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
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}

type timeoutPacketEvent struct {
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string              `json:"event" default:"timeoutPacket"`
	Packet          channeltypes.Packet `json:"packet"`
}

func (im IBCModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	event := timeoutPacketEvent{
		Packet: packet,
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}
