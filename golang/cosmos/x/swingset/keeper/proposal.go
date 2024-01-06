package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

type coreEvalAction struct {
	vm.ActionHeader `actionType:"CORE_EVAL"`
	Evals           []types.CoreEval `json:"evals"`
}

// CoreEvalProposal tells SwingSet to evaluate the given JS code.
func (k Keeper) CoreEvalProposal(ctx sdk.Context, p *types.CoreEvalProposal) error {
	action := &coreEvalAction{
		Evals: p.Evals,
	}

	return k.PushHighPriorityAction(ctx, action)
}
