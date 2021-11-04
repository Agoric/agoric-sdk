package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// Parameter keys
var (
	ParamStoreKeyBeansPerUnit = []byte("beans_per_unit")
	ParamStoreKeyFeeUnitPrice = []byte("fee_unit_price")
)

func NewBeans(u sdk.Uint) Beans {
	return Beans{
		Whole: u,
	}
}

// ParamKeyTable returns the parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// DefaultParams returns default swingset parameters
func DefaultParams() Params {
	return Params{
		BeansPerUnit: DefaultBeansPerUnit,
		FeeUnitPrice: DefaultFeeUnitPrice,
	}
}

func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

// ParamSetPairs returns the parameter set pairs.
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyBeansPerUnit, &p.BeansPerUnit, validateBeansPerUnit),
		paramtypes.NewParamSetPair(ParamStoreKeyFeeUnitPrice, &p.FeeUnitPrice, validateFeeUnitPrice),
	}
}

// ValidateBasic performs basic validation on swingset parameters.
func (p Params) ValidateBasic() error {
	if err := validateBeansPerUnit(p.BeansPerUnit); err != nil {
		return err
	}
	if err := validateFeeUnitPrice(p.FeeUnitPrice); err != nil {
		return err
	}

	return nil
}

func validateBeansPerUnit(i interface{}) error {
	v, ok := i.(map[string]Beans)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	for unit := range v {
		if unit == "" {
			return fmt.Errorf("unit must not be empty")
		}
	}

	return nil
}

func validateFeeUnitPrice(i interface{}) error {
	v, ok := i.(sdk.Coins)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	for _, coin := range v {
		if err := sdk.ValidateDenom(coin.Denom); err != nil {
			return fmt.Errorf("fee unit price denom %s must be valid: %e", coin.Denom, err)
		}
		if coin.Amount.IsNegative() {
			return fmt.Errorf("fee unit price %s must not be negative: %s", coin.Denom, coin.Amount)
		}
	}

	return nil
}
