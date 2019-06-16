package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type deliverInboundAction struct {
	Type        string          `json:"type"`
	Peer        string          `json:"peer"`
	Messages    [][]interface{} `json:"messages"`
	Ack         int             `json:"ack"`
	StoragePort int             `json:"storagePort"`
	BlockHeight int64           `json:"blockHeight"`
}

// FIXME: Get rid of this globals in exchange for a field on some object.
var NodeMessageSender func(needReply bool, str string) (string, error)

// FIXME: Get rid of this global in exchange for a method on some object.
func SendToNode(str string) error {
	_, err := NodeMessageSender(false, str)
	return err
}

// FIXME: Get rid of this global in exchange for a method on some object.
func CallToNode(str string) (string, error) {
	return NodeMessageSender(true, str)
}

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) sdk.Result {
		switch msg := msg.(type) {
		case MsgDeliverInbound:
			return handleMsgDeliverInbound(ctx, keeper, msg)
		default:
			errMsg := fmt.Sprintf("Unrecognized swingset Msg type: %v", msg.Type())
			return sdk.ErrUnknownRequest(errMsg).Result()
		}
	}
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

func handleMsgDeliverInbound(ctx sdk.Context, keeper Keeper, msg MsgDeliverInbound) sdk.Result {
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
		BlockHeight: ctx.BlockHeight(),
		StoragePort: newPort,
	}
	b, err := json.Marshal(action)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	fmt.Fprintln(os.Stderr, "About to call SwingSet")

	out, err := CallToNode(string(b))
	fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	UnregisterPortHandler(newPort)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	return sdk.Result{} // return
}
