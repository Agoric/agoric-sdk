package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const SWINGSET_PORT = 17

type deliverInboundAction struct {
	Type     string          `json:"type"`
	Peer     string          `json:"peer"`
	Messages [][]interface{} `json:"messages"`
	Ack      int             `json:"ack"`
}

var NodeMessageSender func(port int, needReply bool, str string) (string, error)

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

func SendToNode(str string) error {
	_, err := NodeMessageSender(SWINGSET_PORT, false, str)
	return err
}

func CallToNode(str string) (string, error) {
	return NodeMessageSender(SWINGSET_PORT, true, str)
}

type storageMessage struct {
	Method string `json:"method"`
	Key    string `json:"key"`
	Value  string `json:"value"`
}

var myKeeper Keeper
var myContext sdk.Context

func ReceiveFromNode(str string) (string, error) {
	msg := new(storageMessage)
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	switch msg.Method {
	case "set":
		path := strings.Split(msg.Key, ".")
		if len(path) != 2 || path[0] != "mailbox" {
			return "", errors.New("Can only set 'mailbox.PEER'")
		}
		mailbox := NewMailbox()
		mailbox.Value = msg.Value
		myKeeper.SetMailbox(myContext, path[1], mailbox)
	}
	/* TODO: Dispatch based on msg.Method */

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}

func handleMsgDeliverInbound(ctx sdk.Context, keeper Keeper, msg MsgDeliverInbound) sdk.Result {
	messages := make([][]interface{}, len(msg.Messages))
	for i, message := range msg.Messages {
		messages[i] = make([]interface{}, 2)
		messages[i][0] = msg.Nums[i]
		messages[i][1] = message
	}

	action := &deliverInboundAction{
		Type:     "DELIVER_INBOUND",
		Peer:     msg.Peer,
		Messages: messages,
		Ack:      msg.Ack,
	}
	b, err := json.Marshal(action)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	fmt.Fprintln(os.Stderr, "About to call SwingSet")

	// We can set a global because we are guaranteed not to reenter
	// by other transactions until our CallToNode returns.
	myKeeper = keeper
	myContext = ctx
	out, err := CallToNode(string(b))
	fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	return sdk.Result{} // return
}
