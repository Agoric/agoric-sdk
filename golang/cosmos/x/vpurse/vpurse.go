package vpurse

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/chain"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type portHandler struct {
	am     AppModule
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

func NewPortHandler(am AppModule, keeper Keeper) portHandler {
	return portHandler{
		am:     am,
		keeper: keeper,
	}
}

type vpurseSingleBalanceUpdate struct {
	Address string `json:"address"`
	Denom   string `json:"denom"`
	Amount  string `json:"amount"`
}

type vpurseBalanceUpdate struct {
	Nonce   uint64                      `json:"nonce"`
	Type    string                      `json:"type"`
	Updated []vpurseSingleBalanceUpdate `json:"updated"`
}

var nonce uint64

func marshalBalanceUpdate(addressToBalance map[string]sdk.Coins) ([]byte, error) {
	nentries := len(addressToBalance)
	if nentries == 0 {
		return nil, nil
	}

	nonce += 1
	event := vpurseBalanceUpdate{
		Type:    "VPURSE_BALANCE_UPDATE",
		Nonce:   nonce,
		Updated: make([]vpurseSingleBalanceUpdate, 0, nentries),
	}
	for address, coins := range addressToBalance {
		for _, coin := range coins {
			update := vpurseSingleBalanceUpdate{
				Address: address,
				Denom:   coin.Denom,
				Amount:  coin.Amount.String(),
			}
			event.Updated = append(event.Updated, update)
		}
	}

	return json.Marshal(&event)
}

func (ch portHandler) Receive(ctx *chain.ControllerContext, str string) (ret string, err error) {
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
		addressToBalances := make(map[string]sdk.Coins, 1)
		addressToBalances[msg.Sender] = sdk.NewCoins(keeper.GetBalance(ctx.Context, addr, msg.Denom))
		bz, err := marshalBalanceUpdate(addressToBalances)
		if err != nil {
			return "", err
		}
		if bz == nil {
			ret = "true"
		} else {
			ret = string(bz)
		}

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
		addressToBalances := make(map[string]sdk.Coins, 1)
		addressToBalances[msg.Recipient] = sdk.NewCoins(keeper.GetBalance(ctx.Context, addr, msg.Denom))
		bz, err := marshalBalanceUpdate(addressToBalances)
		if err != nil {
			return "", err
		}
		if bz == nil {
			ret = "true"
		} else {
			ret = string(bz)
		}

	case "VPURSE_GIVE_TO_FEE_COLLECTOR":
		value, ok := sdk.NewIntFromString(msg.Amount)
		if !ok {
			return "", fmt.Errorf("cannot convert %s to int", msg.Amount)
		}
		coins := sdk.NewCoins(sdk.NewCoin(msg.Denom, value))
		if err := keeper.SendCoinsToFeeCollector(ctx.Context, coins); err != nil {
			return "", fmt.Errorf("cannot give %s coins: %w", coins.Sort().String(), err)
		}
		if err != nil {
			return "", err
		}
		// We don't supply the module balance, since the controller shouldn't know.
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
