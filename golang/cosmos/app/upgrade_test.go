package gaia

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/stretchr/testify/assert"
)

func TestBuildProposalSteps(t *testing.T) {
	testCases := []struct {
		name         string
		makeStep     func() (vm.CoreProposalStep, error)
		expectedJson string
	}{
		{
			"buildProposalStepFromScript",
			func() (vm.CoreProposalStep, error) {
				return buildProposalStepFromScript(
					"agoric-upgrade-21-a3p",
					"@agoric/builders/scripts/vats/upgrade-orchestration.js",
				)
			},
			`{"module":"@agoric/builders/scripts/vats/upgrade-orchestration.js",` +
				`"entrypoint":"defaultProposalBuilder",` +
				`"args":[{"variant":"A3P_INTEGRATION"}]}`,
		},
		{
			"buildProposalStepWithArgs",
			func() (vm.CoreProposalStep, error) {
				return buildProposalStepWithArgs(
					"@agoric/builders/scripts/vats/upgrade-vats.js",
					"upgradeVatsProposalBuilder",
					// Map iteration is randomised; use an anonymous struct instead.
					struct {
						Ibc string `json:"ibc"`
					}{
						Ibc: "@agoric/vats/src/vat-ibc.js",
					},
				)
			},
			`{"module":"@agoric/builders/scripts/vats/upgrade-vats.js",` +
				`"entrypoint":"upgradeVatsProposalBuilder",` +
				`"args":[{"ibc":"@agoric/vats/src/vat-ibc.js"}]}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ps, err := tc.makeStep()

			assert.NoError(t, err)
			expected := vm.CoreProposalStepForModules(*vm.NewArbitraryCoreProposal(
				tc.expectedJson,
			))

			assert.EqualValues(t, len(expected), len(ps), "Expected length %d to be %d", len(expected), len(ps))
			for i, prop := range ps {
				assert.EqualValues(t, expected[i], prop, "Expected %d to be %v, got %v", i, expected[i], prop)
			}
		})
	}
}
