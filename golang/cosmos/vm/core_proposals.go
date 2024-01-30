package vm

// CoreProposalStep is a set of core proposal configs which are executed
// concurrently
type CoreProposalStep []Jsonable

// CoreProposals is one possible shape for core proposals expressed as a series
// of sequential steps
// see SequentialCoreProposals in packages/deploy-script-support/src/extract-proposal.js
type CoreProposals struct {
	Steps []CoreProposalStep `json:"steps"`
}

// CoreProposalStepForModules generates a single core proposal step from
// the given modules, which will be executed concurrently during that step
func CoreProposalStepForModules(modules ...string) CoreProposalStep {
	step := make([]Jsonable, len(modules))
	for i := range modules {
		step[i] = modules[i]
	}
	return step
}

// CoreProposalsFromSteps returns a CoreProposals from the given steps
func CoreProposalsFromSteps(steps ...CoreProposalStep) *CoreProposals {
	if steps == nil {
		// Deal with https://github.com/golang/go/issues/37711
		return &CoreProposals{Steps: []CoreProposalStep{}}
	}
	return &CoreProposals{Steps: steps}
}
