package swingset

import (
	"encoding/json"
	"fmt"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/capability"
	channel "github.com/cosmos/cosmos-sdk/x/ibc/04-channel"
	channelexported "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/exported"
	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"
	ibctypes "github.com/cosmos/cosmos-sdk/x/ibc/types"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/keeper"
)

// FIXME: How to tell the caller when this is a new channel?

type ChannelEndpoint struct {
	Port    string `json:"port"`
	Channel string `json:"channel"`
}

type channelHandler struct{}

type channelMessage struct { // comes from swingset's IBC handler
	Type      string              `json:"type"` // IBC_METHOD
	Method    string              `json:"method"`
	PortID    string              `json:"portID"`
	ChannelID string              `json:"channelID"`
	Packet    channeltypes.Packet `json:"packet"`
	Ack       []byte              `json:"ack"`
}

func init() {
	RegisterPortHandler("dibc", NewIBCChannelHandler())
}

func NewIBCChannelHandler() channelHandler {
	return channelHandler{}
}

func (ch channelHandler) Receive(ctx *ControllerContext, str string) (ret string, err error) {
	fmt.Println("channel handler received", str)

	msg := new(channelMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	if msg.Type != "IBC_METHOD" {
		return "", fmt.Errorf(`Channel handler only accepts messages of "type": "IBC_METHOD"`)
	}

	switch msg.Method {
	case "sendPacket":
		seq, ok := ctx.Keeper.GetNextSequenceSend(
			ctx.Context,
			msg.Packet.DestinationPort,
			msg.Packet.DestinationChannel,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		// TODO: Maybe allow specification?
		blockTimeout := int64(keeper.DefaultPacketTimeout)

		packet := channeltypes.NewPacket(
			msg.Packet.Data, seq,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			uint64(ctx.Context.BlockHeight()+blockTimeout),
		)
		if err := ctx.Keeper.SendPacket(ctx.Context, packet); err != nil {
			return "", err
		}
		return "null", nil

	case "packetExecuted":
		err := ctx.Keeper.PacketExecuted(ctx.Context, msg.Packet, msg.Ack)
		if err != nil {
			return "", err
		}
		return "null", nil

	case "channelCloseInit":
		err := ctx.Keeper.ChanCloseInit(ctx.Context, msg.PortID, msg.ChannelID)
		if err != nil {
			return "", err
		}
		return "null", nil

	case "bindPort":
		err := ctx.Keeper.BindPort(ctx.Context, msg.PortID)
		if err != nil {
			return "", err
		}
		return "null", nil

	case "timeoutExecuted":
		err := ctx.Keeper.TimeoutExecuted(ctx.Context, msg.Packet)
		if err != nil {
			return "", err
		}
		return "null", nil

	default:
		return "", fmt.Errorf("unrecognized method %s", msg.Method)
	}
}

type channelOpenInitEvent struct {
	Type           string                    `json:"type"`  // IBC
	Event          string                    `json:"event"` // channelOpenInit
	Order          channelexported.Order     `json:"order"`
	ConnectionHops []string                  `json:"connectionHops"`
	PortID         string                    `json:"port"`
	ChannelID      string                    `json:"channel"`
	Counterparty   channeltypes.Counterparty `json:"counterParty"`
	Version        string                    `json:"version"`
}

// Implement IBCModule callbacks
func (am AppModule) OnChanOpenInit(
	ctx sdk.Context,
	order channelexported.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	version string,
) error {
	event := channelOpenInitEvent{
		Type:           "IBC_EVENT",
		Event:          "channelOpenInit",
		Order:          order,
		ConnectionHops: connectionHops,
		PortID:         portID,
		ChannelID:      channelID,
		Counterparty:   counterparty,
		Version:        version,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))

	if err == nil {
		// Claim channel capability passed back by IBC module
		if err := am.keeper.ClaimCapability(ctx, channelCap, ibctypes.ChannelCapabilityPath(portID, channelID)); err != nil {
			return sdkerrors.Wrap(channel.ErrChannelCapabilityNotFound, err.Error())
		}
	}

	return err
}

type channelOpenTryEvent struct {
	Type                string                    `json:"type"`  // IBC
	Event               string                    `json:"event"` // channelOpenTry
	Order               channelexported.Order     `json:"order"`
	ConnectionHops      []string                  `json:"connectionHops"`
	PortID              string                    `json:"portID"`
	ChannelID           string                    `json:"channelID"`
	Counterparty        channeltypes.Counterparty `json:"counterparty"`
	Version             string                    `json:"version"`
	CounterpartyVersion string                    `json:"counterpartyVersion"`
}

func (am AppModule) OnChanOpenTry(
	ctx sdk.Context,
	order channelexported.Order,
	connectionHops []string,
	portID,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	version,
	counterpartyVersion string,
) error {

	event := channelOpenTryEvent{
		Type:                "IBC_EVENT",
		Event:               "channelOpenTry",
		Order:               order,
		ConnectionHops:      connectionHops,
		PortID:              portID,
		ChannelID:           channelID,
		Counterparty:        counterparty,
		Version:             version,
		CounterpartyVersion: counterpartyVersion,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))

	if err == nil {
		// Claim channel capability passed back by IBC module
		if err := am.keeper.ClaimCapability(ctx, channelCap, ibctypes.ChannelCapabilityPath(portID, channelID)); err != nil {
			return sdkerrors.Wrap(channel.ErrChannelCapabilityNotFound, err.Error())
		}
	}

	return err
}

type channelOpenAckEvent struct {
	Type                string `json:"type"`  // IBC
	Event               string `json:"event"` // openAck
	PortID              string `json:"portID"`
	ChannelID           string `json:"channelID"`
	CounterpartyVersion string `json:"counterpartyVersion"`
}

func (am AppModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyVersion string,
) error {

	event := channelOpenAckEvent{
		Type:                "IBC_EVENT",
		Event:               "openAck",
		PortID:              portID,
		ChannelID:           channelID,
		CounterpartyVersion: counterpartyVersion,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))
	return err
}

type channelOpenConfirmEvent struct {
	Type      string `json:"type"`  // IBC
	Event     string `json:"event"` // openConfirm
	PortID    string `json:"portID"`
	ChannelID string `json:"channelID"`
}

func (am AppModule) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelOpenAckEvent{
		Type:      "IBC_EVENT",
		Event:     "openConfirm",
		PortID:    portID,
		ChannelID: channelID,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))

	return err
}

type channelCloseInitEvent struct {
	Type      string `json:"type"`  // IBC
	Event     string `json:"event"` // channelCloseInit
	PortID    string `json:"portID"`
	ChannelID string `json:"channelID"`
}

func (am AppModule) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseInitEvent{
		Type:      "IBC_EVENT",
		Event:     "channelCloseInit",
		PortID:    portID,
		ChannelID: channelID,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))
	return err
}

type channelCloseConfirmEvent struct {
	Type      string `json:"type"`  // IBC
	Event     string `json:"event"` // channelCloseConfirm
	PortID    string `json:"portID"`
	ChannelID string `json:"channelID"`
}

func (am AppModule) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	event := channelCloseConfirmEvent{
		Type:      "IBC_EVENT",
		Event:     "channelCloseConfirm",
		PortID:    portID,
		ChannelID: channelID,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.keeper.CallToController(string(bytes))
	return err
}

type receivePacketEvent struct {
	Type   string              `json:"type"`  // IBC
	Event  string              `json:"event"` // receivePacket
	Packet channeltypes.Packet `json:"packet"`
}

func (am AppModule) OnRecvPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
) (*sdk.Result, error) {

	event := receivePacketEvent{
		Type:   "IBC_EVENT",
		Event:  "receivePacket",
		Packet: packet,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return nil, err
	}

	_, err = am.keeper.CallToController(string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{}, nil
}

type acknowledgementPacketEvent struct {
	Type            string              `json:"type"`  // IBC
	Event           string              `json:"event"` // acknowledgementPacket
	Packet          channeltypes.Packet `json:"packet"`
	Acknowledgement []byte              `json:"acknowledgement"`
}

func (am AppModule) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
) (*sdk.Result, error) {

	event := acknowledgementPacketEvent{
		Type:            "IBC_EVENT",
		Event:           "acknowledgementPacket",
		Packet:          packet,
		Acknowledgement: acknowledgement,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return nil, err
	}

	_, err = am.keeper.CallToController(string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{}, nil
}

type timeoutPacketEvent struct {
	Type   string              `json:"type"`  // IBC
	Event  string              `json:"event"` // acknowledgementPacket
	Packet channeltypes.Packet `json:"packet"`
}

func (am AppModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
) (*sdk.Result, error) {

	event := timeoutPacketEvent{
		Type:   "IBC_EVENT",
		Event:  "timeoutPacket",
		Packet: packet,
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return nil, err
	}

	_, err = am.keeper.CallToController(string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{}, nil
}
