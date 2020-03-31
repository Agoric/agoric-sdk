package swingset

import (
	"encoding/base64"
	"encoding/json"
	"fmt"

	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// FIXME: How to tell the caller when this is a new channel?

type channelEndpoint struct {
	Port    string `json:"port"`
	Channel string `json:"channel"`
}

type channelTuple struct {
	Destination channelEndpoint
	Source channelEndpoint
}

type channelHandler struct {
	Keeper      Keeper
	Context     sdk.Context
	Destination channelEndpoint
	CurrentPacket *channeltypes.Packet
	ChannelPort  int
	Tuple        channelTuple
}

type channelMessage struct {
	Method string `json:"method"`
	Data64   string `json:"data64"`
}

func (cm channelMessage) GetData() []byte {
	data, err := base64.StdEncoding.DecodeString(cm.Data64)
	if err != nil {
		fmt.Println("Could not decode base64 of", cm.Data64, ":", err)
		return nil
	}
	return data
}

var channelHandlers map[channelTuple]*channelHandler

func init() {
	channelHandlers = make(map[channelTuple]*channelHandler)
}

func GetIBCChannelPortHandler(ctx sdk.Context, keeper Keeper, packet channeltypes.Packet) int {
	tuple := channelTuple {
		Destination: channelEndpoint{
			Port:    packet.DestinationPort,
			Channel: packet.DestinationChannel,
		},
		Source: channelEndpoint{
			Port:    packet.SourcePort,
			Channel: packet.SourceChannel,
		},
	};

	// lookup existing channel based on the connection tuple
	if ch, ok := channelHandlers[tuple]; ok {
		ch.CurrentPacket = &packet
		return ch.ChannelPort
	}

	ch := NewChannelHandler(ctx, keeper, tuple)
	ch.CurrentPacket = &packet
	ch.ChannelPort = RegisterPortHandler(ch)
	channelHandlers[tuple] = ch
	return ch.ChannelPort
}

func NewChannelHandler(ctx sdk.Context, keeper Keeper, tuple channelTuple) *channelHandler {
	return &channelHandler{
		Context: ctx,
		Keeper: keeper,
		Tuple: tuple,
	}
}

func (ch *channelHandler) Receive(str string) (ret string, err error) {
	fmt.Println("channel handler received", str)

	msg := new(channelMessage)
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	switch msg.Method {
	case "ack":
		if ch.CurrentPacket == nil {
			return "", fmt.Errorf("current packet is already acknowledged")
		}
		err = ch.Keeper.PacketExecuted(ch.Context, ch.CurrentPacket, msg.GetData())
		ch.CurrentPacket = nil
		if err != nil {
			return "", err
		}
		return "true", nil
	
	case "close":
		// Make sure our port goes away.
		defer func() {
			UnregisterPortHandler(ch.ChannelPort)
			delete(channelHandlers, ch.Tuple)
		}()
		if err = ch.Keeper.ChanCloseInit(ch.Context, ch.Tuple.Destination.Port, ch.Tuple.Destination.Channel); err != nil {
			return "", err
		}
		return "true", nil		
	
	case "send":
		seq, ok := ch.Keeper.GetNextSequenceSend(
			ch.Context,
			ch.Tuple.Destination.Channel,
			ch.Tuple.Destination.Port,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		// FIXME
		blockTimeout := int64(100)

		packet := channeltypes.NewPacket(
			msg.GetData(), seq,
			ch.Tuple.Source.Port, ch.Tuple.Source.Channel,
			ch.Tuple.Destination.Port, ch.Tuple.Destination.Channel,
			uint64(ch.Context.BlockHeight() + blockTimeout),
		)
		if err := ch.Keeper.SendPacket(ch.Context, packet); err != nil{
			return "", err
		}
		return "true", nil

	default:
		return "", fmt.Errorf("unrecognized method %s", msg.Method)
	}
}
