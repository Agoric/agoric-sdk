package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

type coreEvalAction struct {
	Type        string           `json:"type"` // CORE_EVAL
	Evals       []types.CoreEval `json:"evals"`
	BlockHeight int64            `json:"blockHeight"`
	BlockTime   int64            `json:"blockTime"`
}

// CoreEvalProposal tells SwingSet to evaluate the given JS code.
func (k Keeper) CoreEvalProposal(ctx sdk.Context, p *types.CoreEvalProposal) error {
	action := &coreEvalAction{
		Type:        "CORE_EVAL",
		Evals:       p.Evals,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}

	return k.PushHighPriorityAction(ctx, action)
}
