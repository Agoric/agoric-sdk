package vbank

import (
	"testing"

	"github.com/cosmos/gogoproto/proto"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/reflect/protoreflect"
)

func TestAutoCLIOptionsUpdateParamsProposal(t *testing.T) {
	opts := AppModule{}.AutoCLIOptions()
	require.NotNil(t, opts)
	require.NotNil(t, opts.Tx)

	require.Equal(t, vbankMsgServiceName, opts.Tx.Service)
	require.True(t, opts.Tx.EnhanceCustomCommand)

	require.Len(t, opts.Tx.RpcCommandOptions, 1)
	updateParams := opts.Tx.RpcCommandOptions[0]
	require.Equal(t, "UpdateParams", updateParams.RpcMethod)
	require.Equal(t, "update-params-proposal [params]", updateParams.Use)
	require.True(t, updateParams.GovProposal)
	require.Len(t, updateParams.PositionalArgs, 1)
	require.Equal(t, "params", updateParams.PositionalArgs[0].ProtoField)

	files, err := proto.MergedRegistry()
	require.NoError(t, err)
	desc, err := files.FindDescriptorByName(protoreflect.FullName(opts.Tx.Service))
	require.NoError(t, err)
	service, ok := desc.(protoreflect.ServiceDescriptor)
	require.True(t, ok)
	require.NotNil(t, service.Methods().ByName("UpdateParams"))
}
