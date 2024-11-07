package types_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	codec "github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"

	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	clienttypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/types"
)

func TestExtractBaseAddress(t *testing.T) {
	bases := []struct {
		name string
		addr string
	}{
		{"agoric address", "agoric1abcdefghiteaneas"},
		{"cosmos address", "cosmos1abcdeffiharceuht"},
		{"hex address", "0xabcdef198189818c93839ibia"},
	}

	prefixes := []struct {
		prefix      string
		baseIsWrong bool
		isErr       bool
	}{
		{"", false, false},
		{"/", false, true},
		{"orch:/", false, true},
		{"unexpected", true, false},
		{"norch:/", false, true},
		{"orch:", false, true},
		{"norch:", false, true},
		{"\x01", false, true},
	}

	suffixes := []struct {
		suffix      string
		baseIsWrong bool
		isErr       bool
	}{
		{"", false, false},
		{"/", false, false},
		{"/sub/account", false, false},
		{"?query=something&k=v&k2=v2", false, false},
		{"?query=something&k=v&k2=v2#fragment", false, false},
		{"unexpected", true, false},
		{"\x01", false, true},
	}

	for _, b := range bases {
		b := b
		for _, p := range prefixes {
			p := p
			for _, s := range suffixes {
				s := s
				t.Run(b.name+" "+p.prefix+" "+s.suffix, func(t *testing.T) {
					addr := p.prefix + b.addr + s.suffix
					addr, err := types.ExtractBaseAddress(addr)
					if p.isErr || s.isErr {
						require.Error(t, err)
					} else {
						require.NoError(t, err)
						if p.baseIsWrong || s.baseIsWrong {
							require.NotEqual(t, b.addr, addr)
						} else {
							require.Equal(t, b.addr, addr)
						}
					}
				})
			}
		}
	}
}

func TestExtractBaseAddressFromPacket(t *testing.T) {
	ir := cdctypes.NewInterfaceRegistry()
	cdc := codec.NewProtoCodec(ir)
	transfertypes.RegisterInterfaces(ir)
	channeltypes.RegisterInterfaces(ir)
	clienttypes.RegisterInterfaces(ir)

	cases := []struct {
		name  string
		addrs map[types.AddressRole]struct{ addr, baseAddr string }
	}{
		{"sender has params",
			map[types.AddressRole]struct{ addr, baseAddr string }{
				types.RoleSender:   {"cosmos1abcdeffiharceuht?foo=bar&baz=bot#fragment", "cosmos1abcdeffiharceuht"},
				types.RoleReceiver: {"agoric1abcdefghiteaneas", "agoric1abcdefghiteaneas"},
			},
		},
		{"receiver has params",
			map[types.AddressRole]struct{ addr, baseAddr string }{
				types.RoleSender:   {"cosmos1abcdeffiharceuht", "cosmos1abcdeffiharceuht"},
				types.RoleReceiver: {"agoric1abcdefghiteaneas?bingo=again", "agoric1abcdefghiteaneas"},
			},
		},
		{"both are base",
			map[types.AddressRole]struct{ addr, baseAddr string }{
				types.RoleSender:   {"cosmos1abcdeffiharceuht", "cosmos1abcdeffiharceuht"},
				types.RoleReceiver: {"agoric1abcdefghiteaneas", "agoric1abcdefghiteaneas"},
			},
		},
		{"both have params",
			map[types.AddressRole]struct{ addr, baseAddr string }{
				types.RoleSender:   {"agoric1abcdefghiteaneas?bingo=again", "agoric1abcdefghiteaneas"},
				types.RoleReceiver: {"cosmos1abcdeffiharceuht?foo=bar&baz=bot#fragment", "cosmos1abcdeffiharceuht"},
			},
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			ftPacketData := transfertypes.NewFungibleTokenPacketData("denom", "100", tc.addrs[types.RoleSender].addr, tc.addrs[types.RoleReceiver].addr, "my-favourite-memo")
			packetBz, err := cdc.MarshalJSON(&ftPacketData)
			require.NoError(t, err)
			packet := channeltypes.NewPacket(packetBz, 1234, "my-port", "my-channel", "their-port", "their-channel", clienttypes.NewHeight(133, 445), 10999)

			for role, addrs := range tc.addrs {
				addrs := addrs
				role := role

				t.Run(string(role), func(t *testing.T) {
					baseAddr, err := types.ExtractBaseAddress(addrs.addr)
					require.NoError(t, err)
					require.Equal(t, addrs.baseAddr, baseAddr)

					packetBaseAddr, err := types.ExtractBaseAddressFromPacket(cdc, packet, role, nil)
					require.NoError(t, err)
					require.Equal(t, addrs.baseAddr, packetBaseAddr)

					var newPacket channeltypes.Packet
					packetBaseAddr2, err := types.ExtractBaseAddressFromPacket(cdc, packet, role, &newPacket)
					require.NoError(t, err)
					require.Equal(t, addrs.baseAddr, packetBaseAddr2)

					var basePacketData transfertypes.FungibleTokenPacketData
					err = cdc.UnmarshalJSON(newPacket.GetData(), &basePacketData)
					require.NoError(t, err)

					// Check that the only difference between the packet data is the baseAddr.
					packetData := basePacketData
					switch role {
					case types.RoleSender:
						require.Equal(t, addrs.baseAddr, basePacketData.Sender)
						packetData.Sender = addrs.addr
					case types.RoleReceiver:
						require.Equal(t, addrs.baseAddr, basePacketData.Receiver)
						packetData.Receiver = addrs.addr
					default:
						t.Fatal("unexpected role", role)
					}

					require.Equal(t, ftPacketData, packetData)
				})
			}
		})
	}
}
