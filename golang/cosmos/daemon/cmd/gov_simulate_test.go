package cmd

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
	"github.com/stretchr/testify/require"
)

func TestGovSimulateCommandIsMounted(t *testing.T) {
	rootCmd, _ := NewRootCmd(nil)

	txCmd := findChildCommand(rootCmd, "tx")
	require.NotNil(t, txCmd)
	govCmd := findChildCommand(txCmd, govtypes.ModuleName)
	require.NotNil(t, govCmd)
	require.NotNil(t, findChildCommand(govCmd, "simulate-proposal"))
}

func TestReadGovSimulationMessages(t *testing.T) {
	_, encodingConfig := NewRootCmd(nil)

	dir := t.TempDir()
	proposalPath := filepath.Join(dir, "proposal.json")
	require.NoError(t, os.WriteFile(proposalPath, []byte(`{
		"messages": [
			{
				"@type": "/cosmos.gov.v1.MsgSubmitProposal",
				"messages": [
					{
						"@type": "/cosmos.gov.v1.MsgCancelProposal",
						"proposal_id": "7",
						"proposer": "agoric1proposer"
					}
				],
				"initial_deposit": [],
				"proposer": "agoric1proposer",
				"metadata": "",
				"title": "title",
				"summary": "summary",
				"expedited": false
			}
		],
		"metadata": "",
		"deposit": "1ubld",
		"title": "title",
		"summary": "summary",
		"expedited": false
	}`), 0o600))

	msgs, err := readGovProposalSimulationMessages(encodingConfig.Codec, proposalPath)
	require.NoError(t, err)
	require.Len(t, msgs, 1)
	cancelMsg, ok := msgs[0].(*govv1.MsgCancelProposal)
	require.True(t, ok)
	require.Equal(t, uint64(7), cancelMsg.ProposalId)

	txPath := filepath.Join(dir, "tx.json")
	require.NoError(t, os.WriteFile(txPath, []byte(`{
		"body": {
			"messages": [
				{
					"@type": "/cosmos.gov.v1.MsgCancelProposal",
					"proposal_id": "8",
					"proposer": "agoric1proposer"
				}
			]
		}
	}`), 0o600))

	msgs, err = readGovProposalSimulationMessages(encodingConfig.Codec, txPath)
	require.NoError(t, err)
	require.Len(t, msgs, 1)
	cancelMsg, ok = msgs[0].(*govv1.MsgCancelProposal)
	require.True(t, ok)
	require.Equal(t, uint64(8), cancelMsg.ProposalId)
}

func TestSimulateGovMessagesCollectsErrors(t *testing.T) {
	ctx := testutil.DefaultContextWithKeys(nil, nil, nil)
	msgs := []sdk.Msg{
		&govv1.MsgCancelProposal{ProposalId: 1},
		&govv1.MsgCancelProposal{ProposalId: 2},
		&govv1.MsgCancelProposal{ProposalId: 3},
	}

	executed := 0
	err := simulateGovProposalMessages(ctx, msgs, func(msg sdk.Msg) func(sdk.Context, sdk.Msg) (*sdk.Result, error) {
		cancelMsg := msg.(*govv1.MsgCancelProposal)
		if cancelMsg.ProposalId == 2 {
			return nil
		}
		return func(sdk.Context, sdk.Msg) (*sdk.Result, error) {
			executed++
			return nil, errors.New("boom")
		}
	})

	require.Equal(t, 2, executed)
	require.ErrorContains(t, err, "gov proposal simulation failed with 3 error(s):")
	require.ErrorContains(t, err, "- msg 0 (/cosmos.gov.v1.MsgCancelProposal) failed: boom")
	require.ErrorContains(t, err, "- msg 1 (/cosmos.gov.v1.MsgCancelProposal) has no registered handler")
	require.ErrorContains(t, err, "- msg 2 (/cosmos.gov.v1.MsgCancelProposal) failed: boom")
}
