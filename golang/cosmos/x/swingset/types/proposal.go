package types

import (
	"encoding/json"
	"strings"

	sdkioerrors "cosmossdk.io/errors"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
)

const (
	// ProposalTypeCoreEval defines the type for a CoreEvalProposal
	ProposalTypeCoreEval = "CoreEval"
)

var (
	_ govv1beta1.Content = &CoreEvalProposal{}
)

func init() {
	govv1beta1.RegisterProposalType(ProposalTypeCoreEval)
}

// NewCoreEvalProposal creates a new core eval proposal.
func NewCoreEvalProposal(title, description string, evals []CoreEval) govv1beta1.Content {
	return &CoreEvalProposal{
		Title:       title,
		Description: description,
		Evals:       evals,
	}
}

// GetTitle returns the title of a client update proposal.
func (cep *CoreEvalProposal) GetTitle() string { return cep.Title }

// GetDescription returns the description of a client update proposal.
func (cep *CoreEvalProposal) GetDescription() string { return cep.Description }

// ProposalRoute returns the routing key of a client update proposal.
func (cep *CoreEvalProposal) ProposalRoute() string { return RouterKey }

// ProposalType returns the type of a client update proposal.
func (cep *CoreEvalProposal) ProposalType() string { return ProposalTypeCoreEval }

// ValidateBasic runs basic stateless validity checks
func (cep *CoreEvalProposal) ValidateBasic() error {
	err := govv1beta1.ValidateAbstract(cep)
	if err != nil {
		return err
	}

	if len(cep.Evals) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "no core evals provided")
	}
	for i, eval := range cep.Evals {
		if err := eval.ValidateBasic(); err != nil {
			return sdkioerrors.Wrapf(err, "invalid core eval %d", i)
		}
	}

	return nil
}

// ValidateBasic runs basic stateless validity checks
func (ce CoreEval) ValidateBasic() error {
	// Check the permits.
	var rm json.RawMessage
	err := json.Unmarshal([]byte(ce.JsonPermits), &rm)
	if err != nil {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "invalid permit.json: %s", err.Error())
	}

	// Ensure jscode is not empty.
	if len(strings.TrimSpace(ce.JsCode)) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "no code.js provided")
	}
	return nil
}
