package types

import (
	"fmt"

	yaml "gopkg.in/yaml.v2"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// Parameter keys
var (
	ParamStoreKeyBeansPerUnit       = []byte("beans_per_unit")
	ParamStoreKeyBootstrapVatConfig = []byte("bootstrap_vat_config")
	ParamStoreKeyFeeUnitPrice       = []byte("fee_unit_price")
	ParamStoreKeyPowerFlagFees      = []byte("power_flag_fees")
	ParamStoreKeyQueueMax           = []byte("queue_max")
)

func NewStringBeans(key string, beans sdkmath.Uint) StringBeans {
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

func NewQueueSize(key string, sz int32) QueueSize {
	return QueueSize{
		Key:   key,
		Size_: sz,
	}
}

// ParamKeyTable returns the parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// DefaultParams returns default swingset parameters
func DefaultParams() Params {
	return Params{
		BeansPerUnit:       DefaultBeansPerUnit(),
		BootstrapVatConfig: DefaultBootstrapVatConfig,
		FeeUnitPrice:       DefaultFeeUnitPrice,
		PowerFlagFees:      DefaultPowerFlagFees,
		QueueMax:           DefaultQueueMax,
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
		paramtypes.NewParamSetPair(ParamStoreKeyQueueMax, &p.QueueMax, validateQueueMax),
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
	if err := validateQueueMax(p.QueueMax); err != nil {
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
		if err := pff.Fee.Validate(); err != nil {
			return fmt.Errorf("poer flag %s fee must be valid: %e", pff.PowerFlag, err)
		}
	}

	return nil
}

func validateQueueMax(i interface{}) error {
	_, ok := i.([]QueueSize)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	return nil
}

// UpdateParams appends any missing params, configuring them to their defaults,
// then returning the updated params or an error. Existing params are not
// modified, regardless of their value, and they are not removed if they no
// longer appear in the defaults.
func UpdateParams(params Params) (Params, error) {
	newBpu, err := appendMissingDefaultBeansPerUnit(params.BeansPerUnit, DefaultBeansPerUnit())
	if err != nil {
		return params, err
	}
	newPff, err := appendMissingDefaultPowerFlagFees(params.PowerFlagFees, DefaultPowerFlagFees)
	if err != nil {
		return params, err
	}
	newQm, err := appendMissingDefaultQueueSize(params.QueueMax, DefaultQueueMax)
	if err != nil {
		return params, err
	}

	params.BeansPerUnit = newBpu
	params.PowerFlagFees = newPff
	params.QueueMax = newQm
	return params, nil
}

// appendMissingDefaultBeansPerUnit appends the default beans per unit entries
// not in the list of bean costs already, returning the possibly-updated list,
// or an error.
func appendMissingDefaultBeansPerUnit(bpu []StringBeans, defaultBpu []StringBeans) ([]StringBeans, error) {
	existingBpu := make(map[string]struct{}, len(bpu))
	for _, ob := range bpu {
		existingBpu[ob.Key] = struct{}{}
	}

	for _, b := range defaultBpu {
		if _, exists := existingBpu[b.Key]; !exists {
			bpu = append(bpu, b)
		}
	}
	return bpu, nil
}

// appendMissingDefaultPowerFlagFees appends the default power flag fee entries
// not in the list of power flags already, returning the possibly-updated list,
// or an error.
func appendMissingDefaultPowerFlagFees(pff []PowerFlagFee, defaultPff []PowerFlagFee) ([]PowerFlagFee, error) {
	existingPff := make(map[string]struct{}, len(pff))
	for _, of := range pff {
		existingPff[of.PowerFlag] = struct{}{}
	}

	for _, f := range defaultPff {
		if _, exists := existingPff[f.PowerFlag]; !exists {
			pff = append(pff, f)
		}
	}
	return pff, nil
}

// appendMissingDefaultQueueSize appends the default queue size entries not in
// the list of sizes already, returning the possibly-updated list, or an error.
func appendMissingDefaultQueueSize(qs []QueueSize, defaultQs []QueueSize) ([]QueueSize, error) {
	existingQs := make(map[string]struct{}, len(qs))
	for _, os := range qs {
		existingQs[os.Key] = struct{}{}
	}

	for _, s := range defaultQs {
		if _, exists := existingQs[s.Key]; !exists {
			qs = append(qs, s)
		}
	}
	return qs, nil
}
