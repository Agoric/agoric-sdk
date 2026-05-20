package types

import paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

// Parameter keys
var (
	ParamStoreKeyBeansPerUnit                     = []byte("beans_per_unit")
	ParamStoreKeyBootstrapVatConfig               = []byte("bootstrap_vat_config")
	ParamStoreKeyFeeUnitPrice                     = []byte("fee_unit_price")
	ParamStoreKeyPowerFlagFees                    = []byte("power_flag_fees")
	ParamStoreKeyQueueMax                         = []byte("queue_max")
	ParamStoreKeyVatCleanupBudget                 = []byte("vat_cleanup_budget")
	ParamStoreKeyBundleUncompressedSizeLimitBytes = []byte("bundle_uncompressed_size_limit_bytes")
	ParamStoreKeyChunkSizeLimitBytes              = []byte("chunk_size_limit_bytes")
	ParamStoreKeyInstallationDeadlineSeconds      = []byte("installation_deadline_seconds")
	ParamStoreKeyInstallationDeadlineBlocks       = []byte("installation_deadline_blocks")
)

// ParamKeyTable returns the legacy parameter key table.
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// ParamSetPairs returns the legacy parameter set pairs.
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(ParamStoreKeyBeansPerUnit, &p.BeansPerUnit, validateBeansPerUnit),
		paramtypes.NewParamSetPair(ParamStoreKeyFeeUnitPrice, &p.FeeUnitPrice, validateFeeUnitPrice),
		paramtypes.NewParamSetPair(ParamStoreKeyBootstrapVatConfig, &p.BootstrapVatConfig, validateBootstrapVatConfig),
		paramtypes.NewParamSetPair(ParamStoreKeyPowerFlagFees, &p.PowerFlagFees, validatePowerFlagFees),
		paramtypes.NewParamSetPair(ParamStoreKeyQueueMax, &p.QueueMax, validateQueueMax),
		paramtypes.NewParamSetPair(ParamStoreKeyVatCleanupBudget, &p.VatCleanupBudget, validateVatCleanupBudget),
		paramtypes.NewParamSetPair(ParamStoreKeyBundleUncompressedSizeLimitBytes, &p.BundleUncompressedSizeLimitBytes, validateBundleUncompressedSizeLimitBytes),
		paramtypes.NewParamSetPair(ParamStoreKeyChunkSizeLimitBytes, &p.ChunkSizeLimitBytes, validateChunkSizeLimitBytes),
		paramtypes.NewParamSetPair(ParamStoreKeyInstallationDeadlineSeconds, &p.InstallationDeadlineSeconds, validateInstallationDeadlineSeconds),
		paramtypes.NewParamSetPair(ParamStoreKeyInstallationDeadlineBlocks, &p.InstallationDeadlineBlocks, validateInstallationDeadlineBlocks),
	}
}
