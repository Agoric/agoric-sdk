package swingset

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// MsgDeliverInbound defines a DeliverInbound message
type MsgDeliverInbound struct {
	Peer      string
	Messages  []string
	Nums      []int
	Ack       int
	Submitter sdk.AccAddress
}

func NewMsgDeliverInbound(peer string, messages []string, nums []int, ack int, submitter sdk.AccAddress) MsgDeliverInbound {
	return MsgDeliverInbound{
		Peer:      peer,
		Messages:  messages,
		Nums:      nums,
		Ack:       ack,
		Submitter: submitter,
	}
}

// Route should return the name of the module
func (msg MsgDeliverInbound) Route() string { return "swingset" }

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
	if msg.Ack < -1 {
		return sdk.ErrUnknownRequest("Ack cannot be less than -1")
	}
	return nil
}

// GetSignBytes encodes the message for signing
func (msg MsgDeliverInbound) GetSignBytes() []byte {
	b, err := json.Marshal(msg)
	if err != nil {
		panic(err)
	}
	return sdk.MustSortJSON(b)
}

// GetSigners defines whose signature is required
func (msg MsgDeliverInbound) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}
