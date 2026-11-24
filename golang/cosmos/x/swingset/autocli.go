package swingset

import (
	"fmt"

	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"github.com/cosmos/cosmos-sdk/version"
)

const swingsetMsgServiceName = "agoric.swingset.Msg"

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
	return &autocliv1.ModuleOptions{
		Tx: &autocliv1.ServiceCommandDescriptor{
			Service:              swingsetMsgServiceName,
			EnhanceCustomCommand: true,
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				// Already implemented as part of CustomCommand.
				{RpcMethod: "InstallBundle", Skip: true},
				{RpcMethod: "SendChunk", Skip: true},
				{RpcMethod: "DeliverInbound", Skip: true},
				{RpcMethod: "WalletAction", Skip: true},
				{RpcMethod: "WalletSpendAction", Skip: true},
				{RpcMethod: "Provision", Skip: true},
				{RpcMethod: "CoreEval", Skip: true},
				{
					RpcMethod: "UpdateParams",
					Use:       "update-params-proposal [params]",
					Short:     "Submit a proposal to update swingset module params. Note: the entire params must be provided.",
					Long: fmt.Sprintf(
						"Submit a proposal to update swingset module params. Note: the entire params must be provided.\nSee the fields to fill in by running `%s query swingset params --output json`.",
						version.AppName,
					),
					Example:        fmt.Sprintf(`%s tx swingset update-params-proposal '{ params }'`, version.AppName),
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "params"}},
					GovProposal:    true,
				},
			},
		},
	}
}
