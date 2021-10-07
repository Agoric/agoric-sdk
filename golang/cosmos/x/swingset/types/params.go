package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// Parameter keys
var (
	ParamStoreKeyMaxComputronsPerBlock             = []byte("max_computrons_per_block")
	ParamStoreKeyEstimatedComputronsPerVatCreation = []byte("estimated_computrons_per_vat_creation")
	ParamStoreKeyFeeDenom                          = []byte("fee_denom")
	ParamStoreKeyFeePerInboundTx                   = []byte("fee_per_inbound_tx")
	ParamStoreKeyFeePerMessage                     = []byte("fee_per_message")
	ParamStoreKeyFeePerMessageByte                 = []byte("fee_per_message_byte")
	ParamStoreKeyFeePerMessageSlot                 = []byte("fee_per_message_slot")
)

// ParamKeyTable returns the parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// DefaultParams returns default swingset parameters
func DefaultParams() Params {
	return Params{
		MaxComputronsPerBlock:             DefaultMaxComputronsPerBlock,
		EstimatedComputronsPerVatCreation: DefaultEstimatedComputronsPerVatCreation,
		FeeDenom:                          DefaultFeeDenom,
		FeePerInboundTx:                   DefaultFeePerInboundTx,
		FeePerMessage:                     DefaultFeePerMessage,
		FeePerMessageByte:                 DefaultFeePerMessageByte,
		FeePerMessageSlot:                 DefaultFeePerMessageSlot,
	}
}

func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

// ParamSetPairs returns the parameter set pairs.
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyMaxComputronsPerBlock, &p.MaxComputronsPerBlock, validateMaxComputronsPerBlock),
		paramtypes.NewParamSetPair(ParamStoreKeyEstimatedComputronsPerVatCreation, &p.EstimatedComputronsPerVatCreation, validateEstimatedComputronsPerVatCreation),
		paramtypes.NewParamSetPair(ParamStoreKeyFeeDenom, &p.FeeDenom, validateFeeDenom),
		paramtypes.NewParamSetPair(ParamStoreKeyFeePerInboundTx, &p.FeePerInboundTx, validateFeePerInboundTx),
		paramtypes.NewParamSetPair(ParamStoreKeyFeePerMessage, &p.FeePerMessage, validateFeePerMessage),
		paramtypes.NewParamSetPair(ParamStoreKeyFeePerMessageByte, &p.FeePerMessageByte, validateFeePerMessageByte),
		paramtypes.NewParamSetPair(ParamStoreKeyFeePerMessageSlot, &p.FeePerMessageSlot, validateFeePerMessageSlot),
	}
}

// ValidateBasic performs basic validation on swingset parameters.
func (p Params) ValidateBasic() error {
	if err := validateMaxComputronsPerBlock(p.MaxComputronsPerBlock); err != nil {
		return err
	}

	return nil
}

func validateMaxComputronsPerBlock(i interface{}) error {
	v, ok := i.(sdk.Int)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if !v.IsPositive() {
		return fmt.Errorf("max computrons per block must be positive: %s", v)
	}

	return nil
}

func validateEstimatedComputronsPerVatCreation(i interface{}) error {
	v, ok := i.(sdk.Int)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if v.IsNegative() {
		return fmt.Errorf("estimated computrons per vat creation must not be negative: %s", v)
	}

	return nil
}

func validateFeeDenom(i interface{}) error {
	v, ok := i.(string)
	if !ok {
		return fmt.Errorf("invalid fee denom parameter type: %T", i)
	}

	if err := sdk.ValidateDenom(v); err != nil {
		return fmt.Errorf("invalid fee denom %s: %w", v, err)
	}

	return nil
}

func makeFeeValidator(description string) func(interface{}) error {
	return func(i interface{}) error {
		v, ok := i.(sdk.Dec)
		if !ok {
			return fmt.Errorf("invalid %s parameter type: %T", description, i)
		}

		if v.IsNegative() {
			return fmt.Errorf("%s amount must not be negative: %s", description, v)
		}

		return nil
	}
}

var (
	validateFeePerInboundTx   = makeFeeValidator("fee per inbound tx")
	validateFeePerMessage     = makeFeeValidator("fee per message")
	validateFeePerMessageByte = makeFeeValidator("fee per message byte")
	validateFeePerMessageSlot = makeFeeValidator("fee per message slot")
)
