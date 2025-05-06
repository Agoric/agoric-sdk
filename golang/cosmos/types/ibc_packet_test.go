package types_test

import (
	"bytes"
	"encoding/json"
	fmt "fmt"
	"reflect"
	"testing"

	agtypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	clienttypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
)

func CreateTestChannelPacket() channeltypes.Packet {
	return channeltypes.NewPacket(
		[]byte("data"),
		987654321098765432,
		"port-src", "channel-13",
		"port-dst", "channel-42",
		clienttypes.Height{},
		123456789012345678,
	)
}

func TestPacket(t *testing.T) {
	testCases := []struct {
		name   string
		packet ibcexported.PacketI
	}{
		{
			name:   "ibc-go channel Packet",
			packet: CreateTestChannelPacket(),
		},
		{
			name:   "agoric-sdk IBCPacket",
			packet: agtypes.CopyToIBCPacket(CreateTestChannelPacket()),
		},
	}

	// Check that the packets have the expected values
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			pi := tc.packet
			assert.Equal(t, "port-src", pi.GetSourcePort())
			assert.Equal(t, "channel-13", pi.GetSourceChannel())
			assert.Equal(t, "port-dst", pi.GetDestPort())
			assert.Equal(t, "channel-42", pi.GetDestChannel())
			assert.Equal(t, uint64(987654321098765432), pi.GetSequence())
			assert.Equal(t, uint64(123456789012345678), pi.GetTimeoutTimestamp())
			assert.Equal(t, []byte("data"), pi.GetData())
			assert.Equal(t, clienttypes.Height{}, pi.GetTimeoutHeight())
		})
	}
}

func TestPacketJSON(t *testing.T) {
	testCases := []struct {
		name   string
		packet ibcexported.PacketI
		quoted bool
	}{
		{
			name:   "ibc-go channel Packet",
			packet: CreateTestChannelPacket(),
			quoted: false,
		},
		{
			name:   "agoric-sdk IBCPacket",
			packet: agtypes.CopyToIBCPacket(CreateTestChannelPacket()),
			quoted: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			bz, err := json.Marshal(tc.packet)
			require.NoError(t, err)

			seqStr := fmt.Sprintf("%d", tc.packet.GetSequence())
			if !bytes.Contains(bz, []byte(seqStr)) {
				assert.Failf(t, "packet sequence should be present in JSON", "sequence %s, json %s", seqStr, string(bz))
			}

			if bytes.Contains(bz, []byte(`"`+seqStr+`"`)) != tc.quoted {
				if tc.quoted {
					assert.Failf(t, "packet sequence should be quoted in JSON", "sequence %s, json %s", seqStr, string(bz))
				} else {
					assert.Failf(t, "packet sequence should not be quoted in JSON", "sequence %s, json %s", seqStr, string(bz))
				}
			}

			var packet2 ibcexported.PacketI
			switch p := tc.packet.(type) {
			case channeltypes.Packet:
				var p2 channeltypes.Packet
				err = json.Unmarshal(bz, &p2)
				packet2 = p2
			case agtypes.IBCPacket:
				var p2 agtypes.IBCPacket
				err = json.Unmarshal(bz, &p2)
				packet2 = p2
			default:
				t.Fatalf("unexpected packet type %T", p)
			}

			require.NoError(t, err)
			if !reflect.DeepEqual(tc.packet, packet2) {
				assert.Failf(t, "nested packet not equal after JSON round trip", "src %q, dst %q", tc.packet, packet2)
			}
		})
	}
}
