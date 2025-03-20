package gaia

// Deprecated: Use BuiltInCapabilities from github.com/CosmWasm/wasmd/x/wasm/keeper

func AllCapabilities() []string {
	return []string{
		"iterator",
		"staking",
		"stargate",
		"cosmwasm_1_1",
		"cosmwasm_1_2",
		"cosmwasm_1_3",
		"cosmwasm_1_4",
	}
}
