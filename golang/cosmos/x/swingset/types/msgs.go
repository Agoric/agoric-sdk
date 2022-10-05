package types

import (
	"encoding/json"
	"strings"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const RouterKey = ModuleName // this was defined in your key.go file

var (
	_ sdk.Msg = &MsgDeliverInbound{}
	_ sdk.Msg = &MsgProvision{}
	_ sdk.Msg = &MsgInstallBundle{}
	_ sdk.Msg = &MsgWalletAction{}
	_ sdk.Msg = &MsgWalletSpendAction{}

	_ vm.ControllerAdmissionMsg = &MsgDeliverInbound{}
	_ vm.ControllerAdmissionMsg = &MsgInstallBundle{}
	_ vm.ControllerAdmissionMsg = &MsgWalletAction{}
	_ vm.ControllerAdmissionMsg = &MsgWalletSpendAction{}
	// MsgProvision has its own fee mechanism and is intentionally omitted.
)

// Charge an account address for the beans associated with given messages.
func chargeAdmission(ctx sdk.Context, keeper SwingSetKeeper, addr sdk.AccAddress, msgs []string) error {
	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	beans := beansPerUnit[BeansPerInboundTx]
	beans = beans.Add(beansPerUnit[BeansPerMessage].Mul(sdk.NewUint(uint64(len(msgs)))))
	for _, msg := range msgs {
		beans = beans.Add(beansPerUnit[BeansPerMessageByte].Mul(sdk.NewUint(uint64(len(msg)))))
	}

	return keeper.ChargeBeans(ctx, addr, beans)
}

func NewMsgDeliverInbound(msgs *Messages, submitter sdk.AccAddress) *MsgDeliverInbound {
	return &MsgDeliverInbound{
		Messages:  msgs.Messages,
		Nums:      msgs.Nums,
		Ack:       msgs.Ack,
		Submitter: submitter,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgDeliverInbound) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	/*
		// The nondeterministic torture test.  Mark every third message as not inadmissible.
		if rand.Intn(3) == 0 {
			return fmt.Errorf("FIGME: MsgDeliverInbound is randomly not admissible")
		}
	*/

	return chargeAdmission(ctx, keeper, msg.Submitter, msg.Messages)
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
	for _, m := range msg.Messages {
		if len(m) == 0 {
			return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages cannot be empty")
		}
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
	return sdk.MustSortJSON(ModuleAminoCdc.MustMarshalJSON(&msg))
}

// GetSigners defines whose signature is required
func (msg MsgDeliverInbound) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

func NewMsgWalletAction(owner sdk.AccAddress, action string) *MsgWalletAction {
	return &MsgWalletAction{
		Owner:  owner,
		Action: action,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletAction) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	return chargeAdmission(ctx, keeper, msg.Owner, []string{msg.Action})
}

func (msg MsgWalletAction) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Owner}
}

// GetSignBytes encodes the message for signing
func (msg MsgWalletAction) GetSignBytes() []byte {
	return sdk.MustSortJSON(ModuleAminoCdc.MustMarshalJSON(&msg))
}

// Route should return the name of the module
func (msg MsgWalletAction) Route() string { return RouterKey }

// Type should return the action
func (msg MsgWalletAction) Type() string { return "wallet_action" }

// Route should return the name of the module
func (msg MsgWalletSpendAction) Route() string { return RouterKey }

// Type should return the action
func (msg MsgWalletSpendAction) Type() string { return "wallet_spend_action" }

// GetSignBytes encodes the message for signing
func (msg MsgWalletSpendAction) GetSignBytes() []byte {
	return sdk.MustSortJSON(ModuleAminoCdc.MustMarshalJSON(&msg))
}

// ValidateBasic runs stateless checks on the message
func (msg MsgWalletAction) ValidateBasic() error {
	if msg.Owner.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Owner address cannot be empty")
	}
	if len(strings.TrimSpace(msg.Action)) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Action cannot be empty")
	}
	if !json.Valid([]byte(msg.Action)) {
		return sdkerrors.Wrap(sdkerrors.ErrJSONUnmarshal, "Wallet action must be valid JSON")
	}
	return nil
}

func NewMsgWalletSpendAction(owner sdk.AccAddress, spendAction string) *MsgWalletSpendAction {
	return &MsgWalletSpendAction{
		Owner:       owner,
		SpendAction: spendAction,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletSpendAction) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	return chargeAdmission(ctx, keeper, msg.Owner, []string{msg.SpendAction})
}

func (msg MsgWalletSpendAction) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Owner}
}

// ValidateBasic runs stateless checks on the message
func (msg MsgWalletSpendAction) ValidateBasic() error {
	if msg.Owner.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Owner address cannot be empty")
	}
	if len(strings.TrimSpace(msg.SpendAction)) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Spend action cannot be empty")
	}
	if !json.Valid([]byte(msg.SpendAction)) {
		return sdkerrors.Wrap(sdkerrors.ErrJSONUnmarshal, "Wallet spend action must be valid JSON")
	}
	return nil
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
	return nil
}

// GetSignBytes encodes the message for signing
func (msg MsgProvision) GetSignBytes() []byte {
	if msg.PowerFlags == nil {
		msg.PowerFlags = []string{}
	}
	return sdk.MustSortJSON(ModuleAminoCdc.MustMarshalJSON(&msg))
}

// GetSigners defines whose signature is required
func (msg MsgProvision) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

func NewMsgInstallBundle(bundleJson string, submitter sdk.AccAddress) *MsgInstallBundle {
	return &MsgInstallBundle{
		Bundle:    bundleJson,
		Submitter: submitter,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgInstallBundle) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	return chargeAdmission(ctx, keeper, msg.Submitter, []string{msg.Bundle})
}

// Route should return the name of the module
func (msg MsgInstallBundle) Route() string { return RouterKey }

// Type should return the action
func (msg MsgInstallBundle) Type() string { return "installBundle" }

// ValidateBasic runs stateless checks on the message
func (msg MsgInstallBundle) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if len(msg.Bundle) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "Bundle cannot be empty")
	}
	return nil
}

// GetSigners defines whose signature is required
func (msg MsgInstallBundle) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}
