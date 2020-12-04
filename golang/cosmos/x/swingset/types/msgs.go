package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const RouterKey = ModuleName // this was defined in your key.go file

var _, _ sdk.Msg = &MsgDeliverInbound{}, &MsgProvision{}

func NewMsgDeliverInbound(msgs *Messages, submitter sdk.AccAddress) *MsgDeliverInbound {
	return &MsgDeliverInbound{
		Messages:  msgs.Messages,
		Nums:      msgs.Nums,
		Ack:       msgs.Ack,
		Submitter: submitter,
	}
}

// Route should return the name of the module
func (msg MsgDeliverInbound) Route() string { return RouterKey }

// Type should return the action
func (msg MsgDeliverInbound) Type() string { return "eventualSend" }

// ValidateBasic runs stateless checks on the message
func (msg MsgDeliverInbound) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if len(msg.Messages) != len(msg.Nums) {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages and Nums must be the same length")
	}
	for i, num := range msg.Nums {
		if len(msg.Messages[i]) == 0 {
			return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages cannot be empty")
		}
		if num < 0 {
			return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Nums cannot be negative")
		}
	}
	if msg.Ack < 0 {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Ack cannot be negative")
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
		msg.Nums = []uint64{}
	}
	return sdk.MustSortJSON(ModuleCdc.MustMarshalJSON(&msg))
}

// GetSigners defines whose signature is required
func (msg MsgDeliverInbound) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

func NewMsgProvision(nickname string, addr sdk.AccAddress, powerFlags []string, submitter sdk.AccAddress) *MsgProvision {
	return &MsgProvision{
		Nickname:   nickname,
		Address:    addr,
		PowerFlags: powerFlags,
		Submitter:  submitter,
	}
}

// Route should return the name of the module
func (msg MsgProvision) Route() string { return RouterKey }

// Type should return the action
func (msg MsgProvision) Type() string { return "provision" }

// ValidateBasic runs stateless checks on the message
func (msg MsgProvision) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if msg.Address.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Peer address cannot be empty")
	}
	if len(msg.Nickname) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Nickname cannot be empty")
	}
	if msg.PowerFlags == nil {
		msg.PowerFlags = []string{}
	}
	return nil
}

// GetSignBytes encodes the message for signing
func (msg MsgProvision) GetSignBytes() []byte {
	if msg.PowerFlags == nil {
		msg.PowerFlags = []string{}
	}
	return sdk.MustSortJSON(ModuleCdc.MustMarshalJSON(&msg))
}

// GetSigners defines whose signature is required
func (msg MsgProvision) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}
