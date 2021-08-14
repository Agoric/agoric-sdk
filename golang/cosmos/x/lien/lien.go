package lien

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type portHandler struct {
	keeper Keeper
}

type portMessage struct {
	Type    string `json:"type"`
	Address string `json:"address"`
	Denom   string `json:"denom"`
	Amount  string `json:"amount"`
}

type msgAccountState struct {
	CurrentTime string `json:"currentTime"`
	Total       string `json:"total"`
	Bonded      string `json:"bonded"`
	Unbonding   string `json:"unbonding"`
	Locked      string `json:"locked"`
}

func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

const (
	LIEN_GET_ACCOUNT_STATE = "LIEN_GET_ACCOUNT_STATE"
	LIEN_SET_TOTAL         = "LIEN_SET_TOTAL"
)

func (ch portHandler) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg portMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}
	switch msg.Type {
	case LIEN_GET_ACCOUNT_STATE:
		return ch.handleGetAccountState(ctx.Context, msg)

	case LIEN_SET_TOTAL:
		return ch.handleSetTotal(ctx.Context, msg)
	}
	return "", fmt.Errorf("unrecognized type %s", msg.Type)
}

func (ch portHandler) handleGetAccountState(ctx sdk.Context, msg portMessage) (string, error) {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		return "", fmt.Errorf("cannot convert %s to address: %w", msg.Address, err)
	}
	denom := msg.Denom
	if err = sdk.ValidateDenom(denom); err != nil {
		return "", fmt.Errorf("invalid denom %s: %w", denom, err)
	}
	state := ch.keeper.GetAccountState(ctx, addr)
	reply := msgAccountState{
		CurrentTime: ctx.BlockTime().String(),             // XXX check format
		Total:       state.Total.AmountOf(denom).String(), // XXX conversion
		Bonded:      state.Bonded.AmountOf(denom).String(),
		Unbonding:   state.Unbonding.AmountOf(denom).String(),
		Locked:      state.Locked.AmountOf(denom).String(),
	}
	bz, err := json.Marshal(&reply)
	if err != nil {
		return "", fmt.Errorf("cannot marshal %v: %w", reply, err)
	}
	return string(bz), nil
}

func (ch portHandler) handleSetTotal(ctx sdk.Context, msg portMessage) (string, error) {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		return "", fmt.Errorf("cannot convert %s to address: %w", msg.Address, err)
	}
	denom := msg.Denom
	if err = sdk.ValidateDenom(denom); err != nil {
		return "", fmt.Errorf("invalid denom %s: %w", denom, err)
	}
	var amount sdk.Int
	err = amount.UnmarshalJSON([]byte(msg.Amount))
	if err != nil {
		return "", fmt.Errorf("cannot decode lien amount %s: %w", msg.Amount, err)
	}
	lien := ch.keeper.GetAccountLien(ctx, addr)
	oldAmount := lien.Lien.AmountOf(denom)
	if amount.Equal(oldAmount) {
		// no-op, no need to do anything
		return "true", nil
	} else if amount.LT(oldAmount) {
		// always okay to reduce liened amount
		diff := sdk.NewCoin(denom, oldAmount.Sub(amount))
		lien.Lien = lien.Lien.Sub(sdk.NewCoins(diff))
		ch.keeper.SetAccountLien(ctx, lien)
		return "true", nil
	} else {
		// check if it's okay to increase lein
		state := ch.keeper.GetAccountState(ctx, addr)
		total := state.Total.AmountOf(denom)
		bonded := state.Bonded.AmountOf(denom)
		unbonding := state.Unbonding.AmountOf(denom)
		locked := state.Locked.AmountOf(denom)
		unbonded := total.Sub(bonded).Sub(unbonding)
		unlocked := total.Sub(locked)
		if amount.GT(unbonded) || amount.GT(unlocked) {
			return "false", nil
		}
		diff := sdk.NewCoin(denom, amount.Sub(oldAmount))
		lien.Lien = lien.Lien.Add(diff)
		ch.keeper.SetAccountLien(ctx, lien)
		return "true", nil
	}
}
