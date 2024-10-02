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
	ParamStoreKeyVatCleanupBudget   = []byte("vat_cleanup_budget")
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
		VatCleanupBudget:   DefaultVatCleanupBudget,
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
		paramtypes.NewParamSetPair(ParamStoreKeyVatCleanupBudget, &p.VatCleanupBudget, validateVatCleanupBudget),
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
	if err := validateVatCleanupBudget(p.VatCleanupBudget); err != nil {
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

func validateVatCleanupBudget(i interface{}) error {
	entries, ok := i.([]UintMapEntry)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}
	hasDefault := false
	for _, entry := range entries {
		if entry.Key == VatCleanupDefault {
			hasDefault = true
			break
		}
	}
	if len(entries) > 0 && !hasDefault {
		return fmt.Errorf("`default` must be present in a non-empty vat cleanup budget")
	}
	return nil
}

// UpdateParams appends any missing params, configuring them to their defaults,
// then returning the updated params or an error. Existing params are not
// modified, regardless of their value, and they are not removed if they no
// longer appear in the defaults.
func UpdateParams(params Params) (Params, error) {
	newBpu, err := appendMissingDefaults(params.BeansPerUnit, DefaultBeansPerUnit())
	if err != nil {
		return params, err
	}
	newPff, err := appendMissingDefaults(params.PowerFlagFees, DefaultPowerFlagFees)
	if err != nil {
		return params, err
	}
	newQm, err := appendMissingDefaults(params.QueueMax, DefaultQueueMax)
	if err != nil {
		return params, err
	}
	newVcb, err := appendMissingDefaults(params.VatCleanupBudget, DefaultVatCleanupBudget)
	if err != nil {
		return params, err
	}

	params.BeansPerUnit = newBpu
	params.PowerFlagFees = newPff
	params.QueueMax = newQm
	params.VatCleanupBudget = newVcb
	return params, nil
}

// appendMissingDefaults appends to an input list any missing entries with their
// respective default values and returns the result.
func appendMissingDefaults[Entry StringBeans | PowerFlagFee | QueueSize | UintMapEntry](entries []Entry, defaults []Entry) ([]Entry, error) {
	getKey := func(entry any) string {
		switch e := entry.(type) {
		case StringBeans:
			return e.Key
		case PowerFlagFee:
			return e.PowerFlag
		case QueueSize:
			return e.Key
		case UintMapEntry:
			return e.Key
		}
		panic("unreachable")
	}

	existingKeys := make(map[string]bool, len(entries))
	for _, entry := range entries {
		existingKeys[getKey(entry)] = true
	}

	for _, defaultEntry := range defaults {
		if exists := existingKeys[getKey(defaultEntry)]; !exists {
			entries = append(entries, defaultEntry)
		}
	}

	return entries, nil
}
