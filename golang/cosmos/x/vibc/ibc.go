package vibc

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v3/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v3/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v3/modules/core/24-host"

	"github.com/cosmos/ibc-go/v3/modules/core/exported"

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

func (ch IBCModule) Receive(ctx *vm.ControllerContext, str string) (ret string, err error) {
	// fmt.Println("ibc.go downcall", str)
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
			ctx.Context,
			msg.Packet.SourcePort,
			msg.Packet.SourceChannel,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		timeoutTimestamp := msg.Packet.TimeoutTimestamp
		if msg.Packet.TimeoutHeight.IsZero() && msg.Packet.TimeoutTimestamp == 0 {
			// Use the relative timeout if no absolute timeout is specifiied.
			timeoutTimestamp = uint64(ctx.Context.BlockTime().UnixNano()) + msg.RelativeTimeoutNs
		}

		packet := channeltypes.NewPacket(
			msg.Packet.Data, seq,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			msg.Packet.TimeoutHeight, timeoutTimestamp,
		)
		err = keeper.SendPacket(ctx.Context, packet)
		if err == nil {
			bytes, err := json.Marshal(&packet)
			if err == nil {
				ret = string(bytes)
			}
		}

	case "receiveExecuted":
		err = keeper.WriteAcknowledgement(ctx.Context, msg.Packet, msg.Ack)
		if err == nil {
			ret = "true"
		}

	case "startChannelOpenInit":
		err = keeper.ChanOpenInit(
			ctx.Context, stringToOrder(msg.Order), msg.Hops,
			msg.Packet.SourcePort,
			msg.Packet.DestinationPort,
			msg.Version,
		)
		if err == nil {
			ret = "true"
		}

	case "startChannelCloseInit":
		err = keeper.ChanCloseInit(ctx.Context, msg.Packet.SourcePort, msg.Packet.SourceChannel)
		if err == nil {
			ret = "true"
		}

	case "bindPort":
		err = keeper.BindPort(ctx.Context, msg.Packet.SourcePort)
		if err == nil {
			ret = "true"
		}

	case "timeoutExecuted":
		err = keeper.TimeoutExecuted(ctx.Context, msg.Packet)
		if err == nil {
			ret = "true"
		}

	default:
		err = fmt.Errorf("unrecognized method %s", msg.Method)
	}

	// fmt.Println("ibc.go downcall reply", ret, err)
	return
}

func (im IBCModule) PushAction(ctx sdk.Context, action vm.Jsonable) error {
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
) error {
	return sdkerrors.Wrap(
		channeltypes.ErrChannelNotFound,
		fmt.Sprintf("vibc does not allow synthetic channelOpenInit for port %s", portID),
	)
}

type channelOpenTryEvent struct {
	Type                string                    `json:"type"`  // IBC
	Event               string                    `json:"event"` // channelOpenTry
	Order               string                    `json:"order"`
	ConnectionHops      []string                  `json:"connectionHops"`
	PortID              string                    `json:"portID"`
	ChannelID           string                    `json:"channelID"`
	Counterparty        channeltypes.Counterparty `json:"counterparty"`
	Version             string                    `json:"version"`
	CounterpartyVersion string                    `json:"counterpartyVersion"`
	BlockHeight         int64                     `json:"blockHeight"`
	BlockTime           int64                     `json:"blockTime"`
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
		Type:                "IBC_EVENT",
		Event:               "channelOpenTry",
		Order:               orderToString(order),
		ConnectionHops:      connectionHops,
		PortID:              portID,
		ChannelID:           channelID,
		Counterparty:        counterparty,
		Version:             counterpartyVersion, // TODO: Don't just use the counterparty version.
		CounterpartyVersion: counterpartyVersion,
		BlockHeight:         ctx.BlockHeight(),
		BlockTime:           ctx.BlockTime().Unix(),
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
	Type                string                    `json:"type"`  // IBC
	Event               string                    `json:"event"` // channelOpenAck
	PortID              string                    `json:"portID"`
	ChannelID           string                    `json:"channelID"`
	CounterpartyVersion string                    `json:"counterpartyVersion"`
	Counterparty        channeltypes.Counterparty `json:"counterparty"`
	ConnectionHops      []string                  `json:"connectionHops"`
	BlockHeight         int64                     `json:"blockHeight"`
	BlockTime           int64                     `json:"blockTime"`
}

func (im IBCModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID,
	counterpartyChannelID,
	counterpartyVersion string,
) error {
	// We don't care if the channel was found.  If it wasn't then GetChannel
	// returns an empty channel object that we can still use without crashing.
	channel, _ := im.keeper.GetChannel(ctx, portID, channelID)

	event := channelOpenAckEvent{
		Type:                "IBC_EVENT",
		Event:               "channelOpenAck",
		PortID:              portID,
		ChannelID:           channelID,
		CounterpartyVersion: counterpartyVersion,
		Counterparty:        channel.Counterparty,
		ConnectionHops:      channel.ConnectionHops,
		BlockHeight:         ctx.BlockHeight(),
		BlockTime:           ctx.BlockTime().Unix(),
	}

	return im.PushAction(ctx, event)
}

type channelOpenConfirmEvent struct {
	Type        string `json:"type"`  // IBC
	Event       string `json:"event"` // channelOpenConfirm
	PortID      string `json:"portID"`
	ChannelID   string `json:"channelID"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func (im IBCModule) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelOpenConfirmEvent{
		Type:        "IBC_EVENT",
		Event:       "channelOpenConfirm",
		PortID:      portID,
		ChannelID:   channelID,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	return im.PushAction(ctx, event)
}

type channelCloseInitEvent struct {
	Type        string `json:"type"`  // IBC
	Event       string `json:"event"` // channelCloseInit
	PortID      string `json:"portID"`
	ChannelID   string `json:"channelID"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func (im IBCModule) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseInitEvent{
		Type:        "IBC_EVENT",
		Event:       "channelCloseInit",
		PortID:      portID,
		ChannelID:   channelID,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	err := im.PushAction(ctx, event)
	return err
}

type channelCloseConfirmEvent struct {
	Type        string `json:"type"`  // IBC
	Event       string `json:"event"` // channelCloseConfirm
	PortID      string `json:"portID"`
	ChannelID   string `json:"channelID"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func (im IBCModule) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseConfirmEvent{
		Type:        "IBC_EVENT",
		Event:       "channelCloseConfirm",
		PortID:      portID,
		ChannelID:   channelID,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	err := im.PushAction(ctx, event)
	return err
}

type receivePacketEvent struct {
	Type        string              `json:"type"`  // IBC
	Event       string              `json:"event"` // receivePacket
	Packet      channeltypes.Packet `json:"packet"`
	BlockHeight int64               `json:"blockHeight"`
	BlockTime   int64               `json:"blockTime"`
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
		Type:        "IBC_EVENT",
		Event:       "receivePacket",
		Packet:      packet,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(err.Error())
	}

	return nil
}

type acknowledgementPacketEvent struct {
	Type            string              `json:"type"`  // IBC
	Event           string              `json:"event"` // acknowledgementPacket
	Packet          channeltypes.Packet `json:"packet"`
	Acknowledgement []byte              `json:"acknowledgement"`
	BlockHeight     int64               `json:"blockHeight"`
	BlockTime       int64               `json:"blockTime"`
}

func (im IBCModule) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	event := acknowledgementPacketEvent{
		Type:            "IBC_EVENT",
		Event:           "acknowledgementPacket",
		Packet:          packet,
		Acknowledgement: acknowledgement,
		BlockHeight:     ctx.BlockHeight(),
		BlockTime:       ctx.BlockTime().Unix(),
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}

type timeoutPacketEvent struct {
	Type        string              `json:"type"`  // IBC
	Event       string              `json:"event"` // timeoutPacket
	Packet      channeltypes.Packet `json:"packet"`
	BlockHeight int64               `json:"blockHeight"`
	BlockTime   int64               `json:"blockTime"`
}

func (im IBCModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	event := timeoutPacketEvent{
		Type:        "IBC_EVENT",
		Event:       "timeoutPacket",
		Packet:      packet,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	err := im.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}
