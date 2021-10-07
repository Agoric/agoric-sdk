package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// Parameter keys
var (
	ParamStoreKeyFeeEpochDurationBlocks = []byte("fee_epoch_duration_blocks")
)

// ParamKeyTable returns the parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// DefaultParams returns default distribution parameters
func DefaultParams() Params {
	return Params{
		FeeEpochDurationBlocks: 0,
	}
}

func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

// ParamSetPairs returns the parameter set pairs.
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyFeeEpochDurationBlocks, &p.FeeEpochDurationBlocks, validateFeeEpochDurationBlocks),
	}
}

// ValidateBasic performs basic validation on distribution parameters.
func (p Params) ValidateBasic() error {
	if err := validateFeeEpochDurationBlocks(p.FeeEpochDurationBlocks); err != nil {
		return err
	}

	return nil
}

func validateFeeEpochDurationBlocks(i interface{}) error {
	v, ok := i.(int64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if v < 0 {
		return fmt.Errorf("fee epoch duration blocks must be nonnegative: %d", v)
	}

	return nil
}
