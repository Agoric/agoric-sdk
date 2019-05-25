package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const SWINGSET_PORT = 17

type swingSetName = struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

var NodeMessageSender func(port int, needReply bool, str string) (string, error)

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) sdk.Result {
		switch msg := msg.(type) {
		case MsgSetName:
			return handleMsgSetName(ctx, keeper, msg)
		case MsgBuyName:
			return handleMsgBuyName(ctx, keeper, msg)
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

var mySetName func(string, string)

func ReceiveFromNode(str string) (string, error) {
	action := new(swingSetName)
	err := json.Unmarshal([]byte(str), &action)
	if err != nil {
		return "", err
	}

	switch action.Type {
	case "SET_NAME":
		fmt.Fprintln(os.Stderr, "Setting name", action.Name, action.Value)
		mySetName(action.Name, action.Value)
		return "true", nil
	}
	return "", errors.New("Unrecognized action.type " + action.Type)
}

func handleMsgSetName(ctx sdk.Context, keeper Keeper, msg MsgSetName) sdk.Result {
	if !msg.Owner.Equals(keeper.GetOwner(ctx, msg.Name)) { // Checks if the the msg sender is the same as the current owner
		return sdk.ErrUnauthorized("Incorrect Owner").Result() // If not, throw an error
	}

	ssn := &swingSetName{
		Type:  "SET_NAME",
		Name:  msg.Name,
		Value: msg.Value,
	}
	b, err := json.Marshal(ssn)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	fmt.Fprintln(os.Stderr, "About to call SwingSet")
	mySetName = func(name, value string) {
		keeper.SetName(ctx, name, value)
	}
	out, err := CallToNode(string(b))
	fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return sdk.ErrInternal(err.Error()).Result()
	}
	return sdk.Result{} // return
}

// Handle a message to buy name
func handleMsgBuyName(ctx sdk.Context, keeper Keeper, msg MsgBuyName) sdk.Result {
	if keeper.GetPrice(ctx, msg.Name).IsAllGT(msg.Bid) { // Checks if the the bid price is greater than the price paid by the current owner
		return sdk.ErrInsufficientCoins("Bid not high enough").Result() // If not, throw an error
	}
	if keeper.HasOwner(ctx, msg.Name) {
		_, err := keeper.coinKeeper.SendCoins(ctx, msg.Buyer, keeper.GetOwner(ctx, msg.Name), msg.Bid)
		if err != nil {
			return sdk.ErrInsufficientCoins("Buyer does not have enough coins").Result()
		}
	} else {
		_, _, err := keeper.coinKeeper.SubtractCoins(ctx, msg.Buyer, msg.Bid) // If so, deduct the Bid amount from the sender
		if err != nil {
			return sdk.ErrInsufficientCoins("Buyer does not have enough coins").Result()
		}
	}
	keeper.SetOwner(ctx, msg.Name, msg.Buyer)
	keeper.SetPrice(ctx, msg.Name, msg.Bid)
	return sdk.Result{}
}
