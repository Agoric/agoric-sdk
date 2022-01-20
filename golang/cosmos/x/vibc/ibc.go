package vibc

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	capability "github.com/cosmos/cosmos-sdk/x/capability/types"
	channeltypes "github.com/cosmos/ibc-go/v2/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v2/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v2/modules/core/24-host"

	"github.com/cosmos/ibc-go/v2/modules/core/exported"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type portHandler struct {
	ibcModule porttypes.IBCModule
	keeper    Keeper
}

type portMessage struct { // comes from swingset's IBC handler
	Type            string              `json:"type"` // IBC_METHOD
	Method          string              `json:"method"`
	Packet          channeltypes.Packet `json:"packet"`
	RelativeTimeout uint64              `json:"relativeTimeout"`
	Order           string              `json:"order"`
	Hops            []string            `json:"hops"`
	Version         string              `json:"version"`
	Ack             []byte              `json:"ack"`
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

// DefaultRouter is a temporary hack until cosmos-sdk implements its features FIXME.
type DefaultRouter struct {
	*porttypes.Router
	defaultRoute porttypes.IBCModule
}

func NewPortHandler(ibcModule porttypes.IBCModule, keeper Keeper) portHandler {
	return portHandler{
		ibcModule: ibcModule,
		keeper:    keeper,
	}
}

func (ch portHandler) Receive(ctx *vm.ControllerContext, str string) (ret string, err error) {
	// fmt.Println("ibc.go downcall", str)
	keeper := ch.keeper

	msg := new(portMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return ret, err
	}

	if msg.Type != "IBC_METHOD" {
		return "", fmt.Errorf(`Channel handler only accepts messages of "type": "IBC_METHOD"`)
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

		packet := channeltypes.NewPacket(
			msg.Packet.Data, seq,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			msg.Packet.TimeoutHeight, msg.Packet.TimeoutTimestamp,
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

func (am AppModule) CallToController(ctx sdk.Context, send string) (string, error) {
	// fmt.Println("ibc.go upcall", send)
	reply, err := am.keeper.CallToController(ctx, send)
	// fmt.Println("ibc.go upcall reply", reply, err)
	return reply, err
}

func (AppModule) NegotiateAppVersion(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionID string,
	portID string,
	counterparty channeltypes.Counterparty,
	proposedVersion string,
) (version string, err error) {
	// FIXME: We cannot guarantee a synchronous response from the controller, so
	// we always accept the proposed version.
	return proposedVersion, err
}

// Implement IBCModule callbacks
func (am AppModule) OnChanOpenInit(
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

func (am AppModule) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
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
		Order:               orderToString(order),
		ConnectionHops:      connectionHops,
		PortID:              portID,
		ChannelID:           channelID,
		Counterparty:        counterparty,
		Version:             version,
		CounterpartyVersion: counterpartyVersion,
		BlockHeight:         ctx.BlockHeight(),
		BlockTime:           ctx.BlockTime().Unix(),
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
	if err != nil {
		return err
	}

	// Claim channel capability passed back by IBC module
	if err = am.keeper.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
		return sdkerrors.Wrap(channeltypes.ErrChannelCapabilityNotFound, err.Error())
	}

	return err
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

func (am AppModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyVersion string,
) error {
	// We don't care if the channel was found.  If it wasn't then GetChannel
	// returns an empty channel object that we can still use without crashing.
	channel, _ := am.keeper.GetChannel(ctx, portID, channelID)

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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
	return err
}

type channelOpenConfirmEvent struct {
	Type        string `json:"type"`  // IBC
	Event       string `json:"event"` // channelOpenConfirm
	PortID      string `json:"portID"`
	ChannelID   string `json:"channelID"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func (am AppModule) OnChanOpenConfirm(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
	return err
}

type channelCloseInitEvent struct {
	Type        string `json:"type"`  // IBC
	Event       string `json:"event"` // channelCloseInit
	PortID      string `json:"portID"`
	ChannelID   string `json:"channelID"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func (am AppModule) OnChanCloseInit(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
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

func (am AppModule) OnChanCloseConfirm(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
	return err
}

type receivePacketEvent struct {
	Type        string              `json:"type"`  // IBC
	Event       string              `json:"event"` // receivePacket
	Packet      channeltypes.Packet `json:"packet"`
	BlockHeight int64               `json:"blockHeight"`
	BlockTime   int64               `json:"blockTime"`
}

func (am AppModule) OnRecvPacket(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(err.Error())
	}

	_, err = am.CallToController(ctx, string(bytes))
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

func (am AppModule) OnAcknowledgementPacket(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
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

func (am AppModule) OnTimeoutPacket(
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

	bytes, err := json.Marshal(&event)
	if err != nil {
		return err
	}

	_, err = am.CallToController(ctx, string(bytes))
	if err != nil {
		return err
	}

	return nil
}
