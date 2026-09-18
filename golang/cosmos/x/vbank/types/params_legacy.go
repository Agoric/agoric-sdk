package types

import paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

// Parameter keys
var (
	ParamStoreKeyRewardEpochDurationBlocks = []byte("reward_epoch_duration_blocks")
	ParamStoreKeyRewardSmoothingBlocks     = []byte("reward_smoothing_blocks")
	ParamStoreKeyPerEpochRewardFraction    = []byte("per_epoch_reward_fraction")
	ParamStoreKeyAllowedMonitoringAccounts = []byte("allowed_monitoring_accounts")
)

// ParamKeyTable returns the legacy parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// ParamSetPairs returns the legacy parameter set pairs.
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyRewardEpochDurationBlocks, &p.RewardEpochDurationBlocks, validateRewardEpochDurationBlocks),
		paramtypes.NewParamSetPair(ParamStoreKeyRewardSmoothingBlocks, &p.RewardSmoothingBlocks, validateRewardSmoothingBlocks),
		paramtypes.NewParamSetPair(ParamStoreKeyPerEpochRewardFraction, &p.PerEpochRewardFraction, validatePerEpochRewardFraction),
		paramtypes.NewParamSetPair(ParamStoreKeyAllowedMonitoringAccounts, &p.AllowedMonitoringAccounts, validateAllowedMonitoringAccounts),
	}
}
