// Package lien is a cosmos-sdk module that implements liens.
// Liens are an encumbrance that prevents the transfer of tokens
// out of an account, much like the unvested tokens in a vesting
// account.  See spec/ for full details.
package lien

import (
	"encoding/json"
	"fmt"
	"math"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// portHandler implements a vm.PortHandler.
type portHandler struct {
	keeper Keeper
}

// portMessage is a struct that any lien bridge message can unmarshal into.
type portMessage struct {
	Type       string   `json:"type"`
	Address    string   `json:"address"`
	Denom      string   `json:"denom"`
	Delta      sdk.Int  `json:"delta"`
	Validators []string `json:"validators"`
	Delegators []string `json:"delegators"`
}

// msgAccountState marshals into the AccountState message for the lien bridge.
type msgAccountState struct {
	CurrentTime int64   `json:"currentTime"`
	Total       sdk.Int `json:"total"`
	Bonded      sdk.Int `json:"bonded"`
	Unbonding   sdk.Int `json:"unbonding"`
	Locked      sdk.Int `json:"locked"`
	Liened      sdk.Int `json:"liened"`
	// TODO: send unvested amount
}

type delegatorState struct {
	ValidatorIdx []int     `json:"val_idx"`
	Values       []sdk.Int `json:"values"`
	Other        sdk.Int   `json:"other"`
}

type msgStaking struct {
	EpochTag string `json:"epoch_tag"`
	Denom    string `json:"denom"`
	// the following fields are arrays of pointer types so we can use JSON null
	// for out-of-band values
	ValidatorValues []*sdk.Int        `json:"validator_values"`
	DelegatorStates []*delegatorState `json:"delegator_states"`
}

// NewPortHandler returns a port handler for the Keeper.
func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

const (
	LIEN_GET_ACCOUNT_STATE = "LIEN_GET_ACCOUNT_STATE"
	LIEN_GET_STAKING       = "LIEN_GET_STAKING"
	LIEN_CHANGE_LIENED     = "LIEN_CHANGE_LIENED"
)

// Receive implements the vm.PortHandler method.
// Receives and processes a bridge message, returning the
// JSON-encoded response or error.
// See spec/02_messages.md for the messages and responses.
func (ch portHandler) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg portMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}
	switch msg.Type {
	case LIEN_GET_ACCOUNT_STATE:
		return ch.handleGetAccountState(ctx.Context, msg)

	case LIEN_GET_STAKING:
		return ch.handleGetStaking(ctx.Context, msg)

	case LIEN_CHANGE_LIENED:
		return ch.handleChangeLiened(ctx.Context, msg)
	}
	return "", fmt.Errorf("unrecognized type %s", msg.Type)
}

func (ch portHandler) handleGetStaking(ctx sdk.Context, msg portMessage) (string, error) {
	reply := msgStaking{
		EpochTag:        fmt.Sprint(ctx.BlockHeight()),
		Denom:           ch.keeper.BondDenom(ctx),
		ValidatorValues: make([]*sdk.Int, len(msg.Validators)),
		DelegatorStates: make([]*delegatorState, len(msg.Delegators)),
	}
	validatorIndex := map[string]int{} // map of validators addresses to indexes
	for i, v := range msg.Validators {
		validatorIndex[v] = i
		valAddr, err := sdk.ValAddressFromBech32(v)
		if err != nil {
			reply.ValidatorValues[i] = nil
			continue
		}
		value := sdk.NewInt(0)
		validator, found := ch.keeper.GetValidator(ctx, valAddr)
		if found {
			value = validator.Tokens
		}
		reply.ValidatorValues[i] = &value
	}
	for i, d := range msg.Delegators {
		addr, err := sdk.AccAddressFromBech32(d)
		if err != nil {
			reply.DelegatorStates[i] = nil
			continue
		}
		delegations := ch.keeper.GetDelegatorDelegations(ctx, addr, math.MaxUint16)
		// Note that the delegations were returned in a specific order - no nodeterminism
		state := delegatorState{
			ValidatorIdx: make([]int, 0, len(delegations)),
			Values:       make([]sdk.Int, 0, len(delegations)),
			Other:        sdk.NewInt(0),
		}
		for _, d := range delegations {
			valAddr, err := sdk.ValAddressFromBech32(d.ValidatorAddress)
			if err != nil {
				panic(err)
			}
			validator, found := ch.keeper.GetValidator(ctx, valAddr)
			if !found {
				panic("validator not found")
			}
			shares := d.GetShares()
			tokens := validator.TokensFromShares(shares).RoundInt()
			valIndex, found := validatorIndex[valAddr.String()]
			if found {
				state.ValidatorIdx = append(state.ValidatorIdx, valIndex)
				state.Values = append(state.Values, tokens)
			} else {
				state.Other = state.Other.Add(tokens)
			}
		}
		reply.DelegatorStates[i] = &state
	}
	bz, err := json.Marshal(&reply)
	if err != nil {
		return "", fmt.Errorf("cannot marshal %v: %w", reply, err)
	}
	return string(bz), nil
}

// handleGetAccountState processes a LIEN_GET_ACCOUNT_STATE message.
// See spec/02_messages.md for the messages and responses.
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
		CurrentTime: ctx.BlockTime().Unix(),
		Total:       state.Total.AmountOf(denom),
		Bonded:      state.Bonded.AmountOf(denom),
		Unbonding:   state.Unbonding.AmountOf(denom),
		Locked:      state.Locked.AmountOf(denom),
		Liened:      state.Liened.AmountOf(denom),
	}
	bz, err := json.Marshal(&reply)
	if err != nil {
		return "", fmt.Errorf("cannot marshal %v: %w", reply, err)
	}
	return string(bz), nil
}

// handleChangeLiened processes a LIEN_SET_LIENED message.
// See spec/02_messages.md for the messages and responses.
func (ch portHandler) handleChangeLiened(ctx sdk.Context, msg portMessage) (string, error) {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		return "", fmt.Errorf("cannot convert %s to address: %w", msg.Address, err)
	}
	denom := msg.Denom
	if err = sdk.ValidateDenom(denom); err != nil {
		return "", fmt.Errorf("invalid denom %s: %w", denom, err)
	}

	newAmt, err := ch.keeper.ChangeLien(ctx, addr, denom, msg.Delta)
	if err != nil {
		return "", err
	}
	bz, err := json.Marshal(&newAmt)
	if err != nil {
		return "", fmt.Errorf("cannot marshal %v: %w", newAmt, err)
	}
	return string(bz), nil
}
