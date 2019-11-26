package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const RouterKey = ModuleName // this was defined in your key.go file

// MsgDeliverInbound defines a DeliverInbound message
type MsgDeliverInbound struct {
	Peer      string
	Messages  []string
	Nums      []int
	Ack       int
	Submitter sdk.AccAddress
}

func NewMsgDeliverInbound(peer string, msgs *Messages, submitter sdk.AccAddress) MsgDeliverInbound {
	return MsgDeliverInbound{
		Peer:      peer,
		Messages:  msgs.Messages,
		Nums:      msgs.Nums,
		Ack:       msgs.Ack,
		Submitter: submitter,
	}
}

// Route should return the name of the module
func (msg MsgDeliverInbound) Route() string { return RouterKey }

// Type should return the action
func (msg MsgDeliverInbound) Type() string { return "deliver" }

// ValidateBasic runs stateless checks on the message
func (msg MsgDeliverInbound) ValidateBasic() sdk.Error {
	if msg.Submitter.Empty() {
		return sdk.ErrInvalidAddress(msg.Submitter.String())
	}
	if len(msg.Peer) == 0 {
		return sdk.ErrUnknownRequest("Peer cannot be empty")
	}
	if len(msg.Messages) != len(msg.Nums) {
		return sdk.ErrUnknownRequest("Messages and Nums must be the same length")
	}
	for i, num := range msg.Nums {
		if len(msg.Messages[i]) == 0 {
			return sdk.ErrUnknownRequest("Messages cannot be empty")
		}
		if num < 0 {
			return sdk.ErrUnknownRequest("Nums cannot be negative")
		}
	}
	if msg.Ack < 0 {
		return sdk.ErrUnknownRequest("Ack cannot be negative")
	}
	return nil
}

// GetSignBytes encodes the message for signing
func (msg MsgDeliverInbound) GetSignBytes() []byte {
	// FIXME: This compensates for Amino maybe returning nil instead of empty slices.
	if msg.Messages == nil {
		msg.Messages = []string{}
	}
	if msg.Nums == nil {
		msg.Nums = []int{}
	}
	return sdk.MustSortJSON(ModuleCdc.MustMarshalJSON(msg))
}

// GetSigners defines whose signature is required
func (msg MsgDeliverInbound) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}
