package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	// "github.com/Agoric/cosmic-swingset/x/swingset/internal/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

type deliverInboundAction struct {
	Type        string          `json:"type"`
	Peer        string          `json:"peer"`
	Messages    [][]interface{} `json:"messages"`
	Ack         int             `json:"ack"`
	StoragePort int             `json:"storagePort"`
	BlockHeight int64           `json:"blockHeight"`
	BlockTime   int64           `json:"blockTime"`
}

type beginBlockAction struct {
	Type        string `json:"type"`
	StoragePort int    `json:"storagePort"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		case MsgDeliverInbound:
			return handleMsgDeliverInbound(ctx, keeper, msg)
		default:
			errMsg := fmt.Sprintf("Unrecognized swingset Msg type: %v", msg.Type())
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}

func BeginBlock(ctx sdk.Context, keeper Keeper) {
	handleMsgBeginBlock(ctx, keeper)
}

type PortHandler interface {
	Receive(string) (string, error)
}

var portToHandler = map[int]PortHandler{}
var lastPort = 0

func RegisterPortHandler(portHandler PortHandler) int {
	lastPort++
	portToHandler[lastPort] = portHandler
	return lastPort
}
func UnregisterPortHandler(portNum int) error {
	delete(portToHandler, portNum)
	return nil
}

func ReceiveFromNode(portNum int, msg string) (string, error) {
	handler := portToHandler[portNum]
	if handler == nil {
		return "", errors.New("Unregistered port " + fmt.Sprintf("%d", portNum))
	}
	return handler.Receive(msg)
}

func mailboxPeer(key string) (string, error) {
	path := strings.Split(key, ".")
	if len(path) != 2 || path[0] != "mailbox" {
		return "", errors.New("Can only access 'mailbox.PEER'")
	}
	return path[1], nil
}

func handleMsgDeliverInbound(ctx sdk.Context, keeper Keeper, msg MsgDeliverInbound) (*sdk.Result, error) {
	messages := make([][]interface{}, len(msg.Messages))
	for i, message := range msg.Messages {
		messages[i] = make([]interface{}, 2)
		messages[i][0] = msg.Nums[i]
		messages[i][1] = message
	}

	storageHandler := NewStorageHandler(ctx, keeper)
	// Allow the storageHandler to consume unlimited gas.
	storageHandler.Context = storageHandler.Context.WithGasMeter(sdk.NewInfiniteGasMeter())

	newPort := RegisterPortHandler(storageHandler)
	action := &deliverInboundAction{
		Type:        "DELIVER_INBOUND",
		Peer:        msg.Peer,
		Messages:    messages,
		Ack:         msg.Ack,
		StoragePort: newPort,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}
	b, err := json.Marshal(action)
	if err != nil {
		return nil, err
	}

	_, err = keeper.CallToController(string(b))
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	UnregisterPortHandler(newPort)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
}

func handleMsgBeginBlock(ctx sdk.Context, keeper Keeper) (*sdk.Result, error) {
	storageHandler := NewStorageHandler(ctx, keeper)

	// Allow the storageHandler to consume unlimited gas.
	storageHandler.Context = storageHandler.Context.WithGasMeter(sdk.NewInfiniteGasMeter())

	newPort := RegisterPortHandler(storageHandler)

	action := &beginBlockAction{
		Type:        "BEGIN_BLOCK",
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
		StoragePort: newPort,
	}
	b, err := json.Marshal(action)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error marshalling", err)
		return nil, err
	}

	_, err = keeper.CallToController(string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	UnregisterPortHandler(newPort)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
}
