package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

var (
	// This is how many computrons we allow before starting a new block.
	// Some analysis (#3459) suggests this leads to about 2/3rds utilization,
	// based on 5 sec voting time and up to 10 sec of computation.
	DefaultMaxComputronsPerBlock = sdk.NewInt(8000000)
	// observed: 0.385 sec
	DefaultEstimatedComputronsPerVatCreation = sdk.NewInt(300000)
)

// Parameter keys
var (
	ParamStoreKeyMaxComputronsPerBlock             = []byte("maxcomputronsperblock")
	ParamStoreKeyEstimatedComputronsPerVatCreation = []byte("estimatedcomputronspervatcreation")
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
