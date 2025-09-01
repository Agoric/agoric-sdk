package gaia

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"

	"github.com/cosmos/cosmos-sdk/std"
	"github.com/cosmos/cosmos-sdk/types/module"
)

// MakeEncodingConfig creates an EncodingConfig for testing
func MakeEncodingConfig(basicManager module.BasicManager) params.EncodingConfig {
	encodingConfig := params.MakeEncodingConfig()
	std.RegisterLegacyAminoCodec(encodingConfig.Amino)
	std.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	if basicManager != nil {
		basicManager.RegisterLegacyAminoCodec(encodingConfig.Amino)
		basicManager.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	}
	return encodingConfig
}
