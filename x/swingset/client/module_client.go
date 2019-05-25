package client

import (
	swingsetcmd "github.com/Agoric/cosmic-swingset/x/swingset/client/cli"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/spf13/cobra"
	amino "github.com/tendermint/go-amino"
)

// ModuleClient exports all client functionality from this module
type ModuleClient struct {
	storeKey string
	cdc      *amino.Codec
}

func NewModuleClient(storeKey string, cdc *amino.Codec) ModuleClient {
	return ModuleClient{storeKey, cdc}
}

// GetQueryCmd returns the cli query commands for this module
func (mc ModuleClient) GetQueryCmd() *cobra.Command {
	// Group swingset queries under a subcommand
	namesvcQueryCmd := &cobra.Command{
		Use:   "swingset",
		Short: "Querying commands for the swingset module",
	}

	namesvcQueryCmd.AddCommand(client.GetCommands(
		swingsetcmd.GetCmdMailbox(mc.storeKey, mc.cdc),
	)...)

	return namesvcQueryCmd
}

// GetTxCmd returns the transaction commands for this module
func (mc ModuleClient) GetTxCmd() *cobra.Command {
	namesvcTxCmd := &cobra.Command{
		Use:   "swingset",
		Short: "SwingSet transactions subcommands",
	}

	namesvcTxCmd.AddCommand(client.PostCommands(
		swingsetcmd.GetCmdDeliver(mc.cdc),
	)...)

	return namesvcTxCmd
}
