package vpurse

import (
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
)

type portHandler struct {
	keeper Keeper
}

type portMessage struct { // comes from swingset's vat-bank
	Type      string `json:"type"` // VPURSE_*
	Address   string `json:"address"`
	Recipient string `json:"recipient"`
	Sender    string `json:"sender"`
	Denom     string `json:"denom"`
	Amount    string `json:"amount"`
}

func NewPortHandler(keeper Keeper) portHandler {
	return portHandler{
		keeper: keeper,
	}
}

func (ch portHandler) Receive(ctx *swingset.ControllerContext, str string) (ret string, err error) {
	fmt.Println("vpurse.go downcall", str)
	keeper := ch.keeper

	var msg portMessage
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return ret, err
	}

	switch msg.Type {
	case "VPURSE_GET_BALANCE":
		addr, err := sdk.AccAddressFromBech32(msg.Address)
		if err != nil {
			return "", fmt.Errorf("cannot convert %s to address: %w", msg.Address, err)
		}
		coin := keeper.GetBalance(ctx.Context, addr, msg.Denom)
		packet := coin.Amount.String()
		if err == nil {
			bytes, err := json.Marshal(&packet)
			if err == nil {
				ret = string(bytes)
			}
		}

	case "VPURSE_GRAB":
		addr, err := sdk.AccAddressFromBech32(msg.Sender)
		if err != nil {
			return "", fmt.Errorf("cannot convert %s to address: %w", msg.Sender, err)
		}
		value, ok := sdk.NewIntFromString(msg.Amount)
		if !ok {
			return "", fmt.Errorf("cannot convert %s to int", msg.Amount)
		}
		coins := sdk.NewCoins(sdk.NewCoin(msg.Denom, value))
		if err := keeper.GrabCoins(ctx.Context, addr, coins); err != nil {
			return "", fmt.Errorf("cannot grab %s coins: %w", coins.Sort().String(), err)
		}
		ret = "true"

	case "VPURSE_GIVE":
		addr, err := sdk.AccAddressFromBech32(msg.Recipient)
		if err != nil {
			return "", fmt.Errorf("cannot convert %s to address: %w", msg.Recipient, err)
		}
		value, ok := sdk.NewIntFromString(msg.Amount)
		if !ok {
			return "", fmt.Errorf("cannot convert %s to int", msg.Amount)
		}
		coins := sdk.NewCoins(sdk.NewCoin(msg.Denom, value))
		if err := keeper.SendCoins(ctx.Context, addr, coins); err != nil {
			return "", fmt.Errorf("cannot give %s coins: %w", coins.Sort().String(), err)
		}
		ret = "true"

	default:
		err = fmt.Errorf("unrecognized type %s", msg.Type)
	}

	fmt.Println("vpurse.go downcall reply", ret, err)
	return
}

func (am AppModule) CallToController(ctx sdk.Context, send string) (string, error) {
	// fmt.Println("ibc.go upcall", send)
	reply, err := am.keeper.CallToController(ctx, send)
	// fmt.Println("ibc.go upcall reply", reply, err)
	return reply, err
}
