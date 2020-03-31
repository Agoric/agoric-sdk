package swingset

import (
	"encoding/base64"
	"encoding/json"
	"fmt"

	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// FIXME: How to tell the caller when this is a new channel?

type ChannelEndpoint struct {
	Port    string `json:"port"`
	Channel string `json:"channel"`
}

type ChannelTuple struct {
	Destination ChannelEndpoint `json:"dst"`
	Source ChannelEndpoint	`json:"src"`
}

type channelHandler struct {
	Keeper      Keeper
	Context     sdk.Context
	CurrentPacket *channeltypes.Packet
}

type channelMessage struct {
	Method string `json:"method"`
	Tuple  ChannelTuple `json:"tuple"`
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

func NewIBCChannelHandler(ctx sdk.Context, keeper Keeper, packet *channeltypes.Packet) *channelHandler {
	return &channelHandler{
		Context: ctx,
		Keeper: keeper,
		CurrentPacket: packet,
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
		if err = ch.Keeper.ChanCloseInit(ch.Context, msg.Tuple.Destination.Port, msg.Tuple.Destination.Channel); err != nil {
			return "", err
		}
		return "true", nil		
	
	case "send":
		seq, ok := ch.Keeper.GetNextSequenceSend(
			ch.Context,
			msg.Tuple.Destination.Channel,
			msg.Tuple.Destination.Port,
		)
		if !ok {
			return "", fmt.Errorf("unknown sequence number")
		}

		// FIXME
		blockTimeout := int64(100)

		packet := channeltypes.NewPacket(
			msg.GetData(), seq,
			msg.Tuple.Source.Port, msg.Tuple.Source.Channel,
			msg.Tuple.Destination.Port, msg.Tuple.Destination.Channel,
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
