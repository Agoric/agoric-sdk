package swingset

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	// "github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	channelexported "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/exported"
	channeltypes "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/types"
)

type ibcPacketAction struct {
	Type           string       `json:"type"`
	Data64         string       `json:"data64"`
	Tuple          ChannelTuple `json:"tuple"`
	IBCHandlerPort int          `json:"ibcHandlerPort"`
	StoragePort    int          `json:"storagePort"`
	BlockHeight    int64        `json:"blockHeight"`
	BlockTime      int64        `json:"blockTime"`
}

type deliverInboundAction struct {
	Type        string          `json:"type"`
	Peer        string          `json:"peer"`
	Messages    [][]interface{} `json:"messages"`
	Ack         int             `json:"ack"`
	StoragePort int             `json:"storagePort"`
	BlockHeight int64           `json:"blockHeight"`
	BlockTime   int64           `json:"blockTime"`
}

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		defer SetControllerContext(ctx)()
		defer SetControllerKeeper(keeper)()

		switch msg := msg.(type) {
		// IBC channel support.
		case channeltypes.MsgPacket:
			return handleIBCPacket(ctx, keeper, "IBC_PACKET", msg.Packet)
			// these too

		case channeltypes.MsgTimeout:
			return handleIBCPacket(ctx, keeper, "IBC_TIMEOUT", msg.Packet)

		// Legacy deliver inbound.
		// TODO: Sometime merge with IBC?
		case MsgDeliverInbound:
			return handleMsgDeliverInbound(ctx, keeper, msg)

		default:
			errMsg := fmt.Sprintf("Unrecognized swingset Msg type: %v", msg.Type())
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}

func mailboxPeer(key string) (string, error) {
	path := strings.Split(key, ".")
	if len(path) != 2 || path[0] != "mailbox" {
		return "", errors.New("Can only access 'mailbox.PEER'")
	}
	return path[1], nil
}

func handleIBCPacket(ctx sdk.Context, keeper Keeper, actionType string, packet channelexported.PacketI) (*sdk.Result, error) {
	tuple := ChannelTuple{
		Source: ChannelEndpoint{
			Channel: packet.GetSourceChannel(),
			Port:    packet.GetSourcePort(),
		},
		Destination: ChannelEndpoint{
			Channel: packet.GetDestChannel(),
			Port:    packet.GetDestPort(),
		},
	}

	data := packet.GetData()
	data64 := make([]byte, base64.StdEncoding.EncodedLen(len(data)))
	base64.StdEncoding.Encode(data64, data)

	action := &ibcPacketAction{
		Type:           actionType,
		Data64:         string(data64),
		Tuple:          tuple,
		StoragePort:    GetPort("controller"),
		IBCHandlerPort: GetPort("dibc"),
		BlockHeight:    ctx.BlockHeight(),
		BlockTime:      ctx.BlockTime().Unix(),
	}

	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(string(b))
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
}

func handleMsgDeliverInbound(ctx sdk.Context, keeper Keeper, msg MsgDeliverInbound) (*sdk.Result, error) {
	messages := make([][]interface{}, len(msg.Messages))
	for i, message := range msg.Messages {
		messages[i] = make([]interface{}, 2)
		messages[i][0] = msg.Nums[i]
		messages[i][1] = message
	}

	action := &deliverInboundAction{
		Type:        "DELIVER_INBOUND",
		Peer:        msg.Peer,
		Messages:    messages,
		Ack:         msg.Ack,
		StoragePort: GetPort("controller"),
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(string(b))
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
}
