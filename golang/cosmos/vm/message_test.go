package vm_test

import (
	"encoding/json"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/stretchr/testify/require"
)

func TestMessageJSON(t *testing.T) {
	wire, err := json.Marshal(vm.Message{Port: 7, Data: "request", NeedsReply: true})
	require.NoError(t, err)
	require.JSONEq(t, `{"port":7,"data":"request","needsReply":true}`, string(wire))
	var message vm.Message
	require.NoError(t, json.Unmarshal([]byte(`{"port":7,"data":"request","needsReply":true}`), &message))
	require.Equal(t, vm.Message{Port: 7, Data: "request", NeedsReply: true}, message)
	wire, err = json.Marshal(vm.Message{Port: 1, Data: "action", NeedsReply: false})
	require.NoError(t, err)
	require.JSONEq(t, `{"port":1,"data":"action","needsReply":false}`, string(wire))
}
