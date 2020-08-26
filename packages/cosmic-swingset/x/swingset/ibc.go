package swingset

import (
	"encoding/json"
	"fmt"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/capability"
	channel "github.com/cosmos/cosmos-sdk/x/ibc/04-channel"
	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"
	port "github.com/cosmos/cosmos-sdk/x/ibc/05-port"
	porttypes "github.com/cosmos/cosmos-sdk/x/ibc/05-port/types"
	ibctypes "github.com/cosmos/cosmos-sdk/x/ibc/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type channelHandler struct {
	ibcModule porttypes.IBCModule
}

type channelMessage struct { // comes from swingset's IBC handler
	Type            string              `json:"type"` // IBC_METHOD
	Method          string              `json:"method"`
	Packet          channeltypes.Packet `json:"packet"`
	RelativeTimeout uint64              `json:"relativeTimeout"`
	Order           string              `json:"order"`
	Hops            []string            `json:"hops"`
	Version         string              `json:"version"`
	Ack             []byte              `json:"ack"`
}

func stringToOrder(order string) ibctypes.Order {
	switch order {
	case "ORDERED":
		return ibctypes.ORDERED
	case "UNORDERED":
		return ibctypes.UNORDERED
	default:
		return ibctypes.NONE
	}
}

func orderToString(order ibctypes.Order) string {
	switch order {
	case ibctypes.ORDERED:
		return "ORDERED"
	case ibctypes.UNORDERED:
		return "UNORDERED"
	default:
		return "NONE"
	}
}

// DefaultRouter is a temporary hack until cosmos-sdk implements its features FIXME.
type DefaultRouter struct {
	*port.Router
	defaultRoute porttypes.IBCModule
}

func NewIBCChannelHandler(ibcModule porttypes.IBCModule) channelHandler {
	return channelHandler{
		ibcModule: ibcModule,
	}
}

func (ch channelHandler) Receive(ctx *ControllerContext, str string) (ret string, err error) {
	fmt.Println("ibc.go downcall", str)

	msg := new(channelMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return ret, err
	}

	if msg.Type != "IBC_METHOD" {
		return "", fmt.Errorf(`Channel handler only accepts messages of "type": "IBC_METHOD"`)
	}

	switch msg.Method {
	case "sendPacket":
		seq, ok := ctx.Keeper.GetNextSequenceSend(
			ctx.Context,
			msg.Packet.SourcePort,
			msg.Packet.SourceChannel,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		var absoluteTimeout uint64
		if msg.RelativeTimeout == 0 {
			absoluteTimeout = msg.Packet.TimeoutHeight
		} else {
			// FIXME: Is the current context's blockheight really something we
			// should use?  Does this need to be the destination's blockheight?
			absoluteTimeout = uint64(ctx.Context.BlockHeight()) + msg.RelativeTimeout
		}

		packet := channeltypes.NewPacket(
			msg.Packet.Data, seq,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			absoluteTimeout, 0,
		)
		err = ctx.Keeper.SendPacket(ctx.Context, packet)
		if err == nil {
			bytes, err := json.Marshal(&packet)
			if err == nil {
				ret = string(bytes)
			}
		}

	case "packetExecuted":
		err = ctx.Keeper.PacketExecuted(ctx.Context, msg.Packet, msg.Ack)
		if err == nil {
			ret = "true"
		}

	case "startChannelOpenInit":
		/* TODO: Find out what is necessary to wake up a passive relayer.
		err = ctx.Keeper.ChanOpenInit(
			ctx.Context, stringToOrder(msg.Order), msg.Hops,
			msg.Packet.SourcePort, msg.Packet.SourceChannel,
			msg.Packet.DestinationPort, msg.Packet.DestinationChannel,
			msg.Version,
		)
		*/
		if err == nil {
			ret = "true"
		}
		break

	case "continueChannelOpenTry":
		/* TODO: Call ctx.Keeper.ChanOpenTry.
		 */
		if err == nil {
			ret = "true"
		}
		break

	case "channelCloseInit":
		err = ctx.Keeper.ChanCloseInit(ctx.Context, msg.Packet.SourcePort, msg.Packet.SourceChannel)
		if err == nil {
			ret = "true"
		}

	case "bindPort":
		err = ctx.Keeper.BindPort(ctx.Context, msg.Packet.SourcePort)
		if err == nil {
			ret = "true"
		}

	case "timeoutExecuted":
		err = ctx.Keeper.TimeoutExecuted(ctx.Context, msg.Packet)
		if err == nil {
			ret = "true"
		}

	default:
		err = fmt.Errorf("unrecognized method %s", msg.Method)
	}

	fmt.Println("ibc.go downcall reply", ret, err)
	return
}

func (am AppModule) CallToController(ctx sdk.Context, send string) (string, error) {
	// fmt.Println("ibc.go upcall", send)
	reply, err := am.keeper.CallToController(ctx, send)
	// fmt.Println("ibc.go upcall reply", reply, err)
	return reply, err
}

type channelOpenInitEvent struct {
	Type           string                    `json:"type"`  // IBC
	Event          string                    `json:"event"` // channelOpenInit
	Order          string                    `json:"order"`
	ConnectionHops []string                  `json:"connectionHops"`
	PortID         string                    `json:"portID"`
	ChannelID      string                    `json:"channelID"`
	Counterparty   channeltypes.Counterparty `json:"counterparty"`
	Version        string                    `json:"version"`
	BlockHeight    int64                     `json:"blockHeight"`
	BlockTime      int64                     `json:"blockTime"`
}

// Implement IBCModule callbacks
func (am AppModule) OnChanOpenInit(
	ctx sdk.Context,
	order ibctypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	version string,
) error {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

	event := channelOpenInitEvent{
		Type:           "IBC_EVENT",
		Event:          "channelOpenInit",
		Order:          orderToString(order),
		ConnectionHops: connectionHops,
		PortID:         portID,
		ChannelID:      channelID,
		Counterparty:   counterparty,
		Version:        version,
		BlockHeight:    ctx.BlockHeight(),
		BlockTime:      ctx.BlockTime().Unix(),
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
	if err = am.keeper.ClaimCapability(ctx, channelCap, ibctypes.ChannelCapabilityPath(portID, channelID)); err != nil {
		return sdkerrors.Wrap(channel.ErrChannelCapabilityNotFound, err.Error())
	}

	return err
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
	order ibctypes.Order,
	connectionHops []string,
	portID,
	channelID string,
	channelCap *capability.Capability,
	counterparty channeltypes.Counterparty,
	version,
	counterpartyVersion string,
) error {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
	if err = am.keeper.ClaimCapability(ctx, channelCap, ibctypes.ChannelCapabilityPath(portID, channelID)); err != nil {
		return sdkerrors.Wrap(channel.ErrChannelCapabilityNotFound, err.Error())
	}

	return err
}

type channelOpenAckEvent struct {
	Type                string `json:"type"`  // IBC
	Event               string `json:"event"` // channelOpenAck
	PortID              string `json:"portID"`
	ChannelID           string `json:"channelID"`
	CounterpartyVersion string `json:"counterpartyVersion"`
	BlockHeight         int64  `json:"blockHeight"`
	BlockTime           int64  `json:"blockTime"`
}

func (am AppModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyVersion string,
) error {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

	event := channelOpenAckEvent{
		Type:                "IBC_EVENT",
		Event:               "channelOpenAck",
		PortID:              portID,
		ChannelID:           channelID,
		CounterpartyVersion: counterpartyVersion,
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
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
) (*sdk.Result, error) {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return &sdk.Result{}, nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
		return nil, err
	}

	_, err = am.CallToController(ctx, string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
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
) (*sdk.Result, error) {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return &sdk.Result{}, nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

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
		return nil, err
	}

	_, err = am.CallToController(ctx, string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
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
) (*sdk.Result, error) {
	if committedHeight == ctx.BlockHeight() {
		// We don't support simulation.
		return &sdk.Result{}, nil
	} else {
		// The simulation was done, so now allow infinite gas.
		ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	}

	event := timeoutPacketEvent{
		Type:        "IBC_EVENT",
		Event:       "timeoutPacket",
		Packet:      packet,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	bytes, err := json.Marshal(&event)
	if err != nil {
		return nil, err
	}

	_, err = am.CallToController(ctx, string(bytes))
	if err != nil {
		return nil, err
	}

	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
}
