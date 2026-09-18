package vbank

import (
	"fmt"

	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"github.com/cosmos/cosmos-sdk/version"
)

const vbankMsgServiceName = "agoric.vbank.Msg"

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
	return &autocliv1.ModuleOptions{
		Tx: &autocliv1.ServiceCommandDescriptor{
			Service:              vbankMsgServiceName,
			EnhanceCustomCommand: true,
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "UpdateParams",
					Use:       "update-params-proposal [params]",
					Short:     "Submit a proposal to update vbank module params. Note: the entire params must be provided.",
					Long: fmt.Sprintf(
						"Submit a proposal to update vbank module params. Note: the entire params must be provided.\nSee the fields to fill in by running `%s query vbank params --output json`.",
						version.AppName,
					),
					Example:        fmt.Sprintf(`%s tx vbank update-params-proposal '{ params }'`, version.AppName),
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "params"}},
					GovProposal:    true,
				},
			},
		},
	}
}
