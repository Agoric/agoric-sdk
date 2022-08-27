package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// Parameter keys
var (
	ParamStoreKeyBeansPerUnit       = []byte("beans_per_unit")
	ParamStoreKeyBootstrapVatConfig = []byte("bootstrap_vat_config")
	ParamStoreKeyFeeUnitPrice       = []byte("fee_unit_price")
	ParamStoreKeyPowerFlagFees      = []byte("power_flag_fees")
)

func NewStringBeans(key string, beans sdk.Uint) StringBeans {
	return StringBeans{
		Key:   key,
		Beans: beans,
	}
}

func NewPowerFlagFee(powerFlag string, fee sdk.Coins) PowerFlagFee {
	return PowerFlagFee{
		PowerFlag: powerFlag,
		Fee:       fee,
	}
}

// ParamKeyTable returns the parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// DefaultParams returns default swingset parameters
func DefaultParams() Params {
	return Params{
		BeansPerUnit:       DefaultBeansPerUnit,
		BootstrapVatConfig: DefaultBootstrapVatConfig,
		FeeUnitPrice:       DefaultFeeUnitPrice,
		PowerFlagFees:      DefaultPowerFlagFees,
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
		paramtypes.NewParamSetPair(ParamStoreKeyBootstrapVatConfig, &p.BootstrapVatConfig, validateBootstrapVatConfig),
		paramtypes.NewParamSetPair(ParamStoreKeyPowerFlagFees, &p.PowerFlagFees, validatePowerFlagFees),
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
	if err := validateBootstrapVatConfig(p.BootstrapVatConfig); err != nil {
		return err
	}
	if err := validatePowerFlagFees(p.PowerFlagFees); err != nil {
		return err
	}

	return nil
}

func validateBeansPerUnit(i interface{}) error {
	v, ok := i.([]StringBeans)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	for _, sb := range v {
		if sb.Key == "" {
			return fmt.Errorf("key must not be empty")
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

func validateBootstrapVatConfig(i interface{}) error {
	v, ok := i.(string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if v == "" {
		return fmt.Errorf("bootstrap vat config must not be empty")
	}

	return nil
}

func validatePowerFlagFees(i interface{}) error {
	v, ok := i.([]PowerFlagFee)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	for _, pff := range v {
		if pff.PowerFlag == "" {
			return fmt.Errorf("power flag must not be empty")
		}
		for _, coin := range pff.Fee {
			if err := sdk.ValidateDenom(coin.Denom); err != nil {
				return fmt.Errorf("power flag %s fee denom %s must be valid: %e", pff.PowerFlag, coin.Denom, err)
			}
			if coin.Amount.IsNegative() {
				return fmt.Errorf("power flag %s fee %s must not be negative: %s", pff.PowerFlag, coin.Denom, coin.Amount)
			}
		}
	}

	return nil
}
