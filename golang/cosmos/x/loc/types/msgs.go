package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgUpdateLoc{}

func NewMsgUpdateLoc(addr sdk.AccAddress, collateral sdk.Coin, loan sdk.Coin) *MsgUpdateLoc {
	return &MsgUpdateLoc{
		Address:    addr.String(),
		Collateral: &collateral,
		Loan:       &loan,
	}
}

func (msg MsgUpdateLoc) ValidateBasic() error {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		return err
	}
	if err := sdk.VerifyAddressFormat(addr); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid address: %s", err)
	}
	if !msg.Collateral.IsValid() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidCoins, msg.Collateral.String())
	}
	if !msg.Loan.IsValid() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidCoins, msg.Loan.String())
	}
	return nil
}

func (msg MsgUpdateLoc) GetSigners() []sdk.AccAddress {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{addr}
}

var _ sdk.Msg = &MsgUpdateLocLoan{}

func NewMsgUpdateLocLoan(addr sdk.AccAddress, loan sdk.Coin) *MsgUpdateLocLoan {
	return &MsgUpdateLocLoan{
		Address: addr.String(),
		Loan:    &loan,
	}
}

func (msg MsgUpdateLocLoan) ValidateBasic() error {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		return err
	}
	if err := sdk.VerifyAddressFormat(addr); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid address: %s", err)
	}
	if !msg.Loan.IsValid() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidCoins, msg.Loan.String())
	}
	return nil
}

func (msg MsgUpdateLocLoan) GetSigners() []sdk.AccAddress {
	addr, err := sdk.AccAddressFromBech32(msg.Address)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{addr}
}
