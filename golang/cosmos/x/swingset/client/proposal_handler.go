package client

import (
	"net/http"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/types/rest"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
	govrest "github.com/cosmos/cosmos-sdk/x/gov/client/rest"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/client/cli"
)

var (
	CoreEvalProposalHandler = govclient.NewProposalHandler(cli.NewCmdSubmitCoreEvalProposal, emptyRestHandler)
)

func emptyRestHandler(client.Context) govrest.ProposalRESTHandler {
	return govrest.ProposalRESTHandler{
		SubRoute: "unsupported-swingset",
		Handler: func(w http.ResponseWriter, r *http.Request) {
			rest.WriteErrorResponse(w, http.StatusBadRequest, "Legacy REST Routes are not supported for SwingSet proposals")
		},
	}
}
