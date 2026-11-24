package cli

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/stretchr/testify/require"
)

func TestGetQueryCmdIncludesParams(t *testing.T) {
	cmd := GetQueryCmd(types.StoreKey)
	paramsCmd, _, err := cmd.Find([]string{"params"})
	require.NoError(t, err)
	require.NotNil(t, paramsCmd)
	require.Equal(t, "params", paramsCmd.Name())
}
