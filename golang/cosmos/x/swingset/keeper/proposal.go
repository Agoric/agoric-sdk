package keeper

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

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

	bz, err := json.Marshal(action)
	if err != nil {
		return sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = k.CallToController(ctx, string(bz))
	if err != nil {
		return err
	}

	return nil
}
