package types

import (
	"encoding/json"
	"testing"

	"gopkg.in/yaml.v2"

	"github.com/stretchr/testify/require"
)

func formatOutput(i interface{}) (string, error) {
	out, err := json.Marshal(i)
	if err != nil {
		return "", err
	}

	err = json.Unmarshal(out, &i)
	if err != nil {
		return "", err
	}

	out, err = yaml.Marshal(i)
	if err != nil {
		return "", err
	}

	return string(out), nil
}

func TestCoreEvalProposal(t *testing.T) {
	ce1 := CoreEval{
		JsonPermits: `{
  "consume": {
    "aggregators": true
  }
}`,
		JsCode: `// create-gov.js initially created this file.
/* eslint-disable */

const AGORIC_INSTANCE_NAME = "BLD-USD priceAggregator";

AGORIC_INSTANCE_NAME;
`,
	}
	cep := NewCoreEvalProposal("test title", "test description", []CoreEval{ce1})

	require.Equal(t, "test title", cep.GetTitle())
	require.Equal(t, "test description", cep.GetDescription())
	require.Equal(t, RouterKey, cep.ProposalRoute())
	require.Equal(t, ProposalTypeCoreEval, cep.ProposalType())

	text, err := formatOutput(cep)
	require.NoError(t, err)
	require.Equal(t, `title: test title
description: test description
evals:
- json_permits: |-
    {
      "consume": {
        "aggregators": true
      }
    }
  js_code: |
    // create-gov.js initially created this file.
    /* eslint-disable */

    const AGORIC_INSTANCE_NAME = "BLD-USD priceAggregator";

    AGORIC_INSTANCE_NAME;
`, text)
	require.Nil(t, cep.ValidateBasic())

	ce2 := CoreEval{JsonPermits: `{"a": true}`, JsCode: "bar"}
	cep = NewCoreEvalProposal("test title", "test description", []CoreEval{ce2})
	require.NoError(t, cep.ValidateBasic())

	ce3 := CoreEval{JsonPermits: "", JsCode: "bar"}
	cep = NewCoreEvalProposal("test title", "test description", []CoreEval{ce3})
	require.Error(t, cep.ValidateBasic())

	ce4 := CoreEval{JsonPermits: `{"a": true}`, JsCode: ""}
	cep = NewCoreEvalProposal("test title", "test description", []CoreEval{ce4})
	require.Error(t, cep.ValidateBasic())

	ce5 := CoreEval{JsonPermits: "BAD-JSON", JsCode: "bar"}
	cep = NewCoreEvalProposal("test title", "test description", []CoreEval{ce5})
	require.Error(t, cep.ValidateBasic())
}
