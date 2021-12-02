package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	yaml "gopkg.in/yaml.v2"
)

// Parameter keys
var (
	ParamStoreKeyStandaloneRatio = []byte("standalone_ratio")
)

func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

func DefaultParams() Params {
	return Params{}
}

func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyStandaloneRatio, &p.StandaloneRatio, validateStandaloneRatio),
	}
}

func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

func (p Params) ValidateBasic() error {
	if err := validateStandaloneRatio(p.StandaloneRatio); err != nil {
		return err
	}
	return nil
}

func validateStandaloneRatio(i interface{}) error {
	ratio, ok := i.(*sdk.DecCoin)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	if ratio == nil || ratio.Amount.IsNil() {
		return nil
	}
	if err := sdk.ValidateDenom(ratio.Denom); err != nil {
		return err
	}
	if ratio.Amount.IsNegative() {
		return fmt.Errorf("standalone loc ratio is negative: %v", ratio.Amount)
	}
	return nil
}
