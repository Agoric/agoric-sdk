package cli

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetQueryCmdIncludesParams(t *testing.T) {
	cmd := GetQueryCmd()
	paramsCmd, _, err := cmd.Find([]string{"params"})
	require.NoError(t, err)
	require.NotNil(t, paramsCmd)
	require.Equal(t, "params", paramsCmd.Name())
}
