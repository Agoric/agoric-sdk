package client

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/client/cli"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
)

var (
	CoreEvalProposalHandler = govclient.NewProposalHandler(cli.NewCmdSubmitCoreEvalProposal)
)
