package types

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/cosmos/cosmos-sdk/codec"

	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	clienttypes "github.com/cosmos/ibc-go/v6/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v6/modules/core/04-channel/types"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
)

type AddressRole string

const (
	RoleSender   AddressRole = "Sender"
	RoleReceiver AddressRole = "Receiver"
)

func trimSlashPrefix(s string) string {
	return strings.TrimPrefix(s, "/")
}

// ExtractBaseAddress extracts the base address from a parameterized address.
// It removes all subpath and query components from addr.
func ExtractBaseAddress(addr string) (string, error) {
	parsed, err := url.Parse(addr)
	if err != nil {
		return "", err
	}

	// Specify the fields and values we expect.  Unspecified fields will only
	// match if they are zero values in order to be robust against extensions to
	// the url.URL struct.
	//
	// Remove leading slashes from the path fields so that only parsed relative
	// paths match the expected test.
	expected := url.URL{
		Path:        trimSlashPrefix(parsed.Path),
		RawPath:     trimSlashPrefix(parsed.RawPath),
		RawQuery:    parsed.RawQuery,
		Fragment:    parsed.Fragment,
		RawFragment: parsed.RawFragment,

		// Skip over parsing control flags.
		ForceQuery: parsed.ForceQuery,
		OmitHost:   parsed.OmitHost,
	}

	if *parsed != expected {
		return "", fmt.Errorf("address must be relative path with optional query and fragment, got %s", addr)
	}

	baseAddr, _, _ := strings.Cut(expected.Path, "/")
	if baseAddr == "" {
		return "", fmt.Errorf("base address cannot be empty")
	}

	return baseAddr, nil
}

// extractBaseTransferData returns the base address from the transferData.Sender
// (if RoleSender) or transferData.Receiver (if RoleReceiver). Errors in
// determining the base address are ignored... we then assume the base address
// is exactly the original address.  If newTransferData is not nil, it will be
// populated with a new FungibleTokenPacketData consisting of the role replaced
// with its base address.
func extractBaseTransferData(transferData transfertypes.FungibleTokenPacketData, role AddressRole, newTransferData *transfertypes.FungibleTokenPacketData) (string, error) {
	var target string
	sender := transferData.Sender
	receiver := transferData.Receiver

	switch role {
	case RoleSender:
		baseSender, err := ExtractBaseAddress(sender)
		if err == nil {
			sender = baseSender
		}
		target = sender

	case RoleReceiver:
		baseReceiver, err := ExtractBaseAddress(receiver)
		if err == nil {
			receiver = baseReceiver
		}
		target = receiver

	default:
		err := fmt.Errorf("invalid address role: %s", role)
		return target, err
	}

	if newTransferData == nil {
		return target, nil
	}

	// Create the new transfer data.
	*newTransferData = transfertypes.NewFungibleTokenPacketData(
		transferData.Denom,
		transferData.Amount,
		sender, receiver,
		transferData.Memo,
	)

	return target, nil
}

// ExtractBaseAddressFromPacket returns the base address from a transfer
// packet's data, either Sender (if role is RoleSender) or Receiver (if role is
// RoleReceiver).
// Errors in determining the base address are ignored... we then assume the base
// address is exactly the original address.
// If newPacket is not nil, it is populated with a new transfer packet whose
// corresponding Sender or Receiver is replaced with the extracted base address.
func ExtractBaseAddressFromPacket(cdc codec.Codec, packet ibcexported.PacketI, role AddressRole, newPacket *channeltypes.Packet) (string, error) {
	transferData := transfertypes.FungibleTokenPacketData{}
	if err := cdc.UnmarshalJSON(packet.GetData(), &transferData); err != nil {
		return "", err
	}

	var newTransferData *transfertypes.FungibleTokenPacketData
	if newPacket != nil {
		// Capture the transfer data for the new packet.
		newTransferData = &transfertypes.FungibleTokenPacketData{}
	}
	target, err := extractBaseTransferData(transferData, role, newTransferData)
	if err != nil {
		return target, err
	}

	if newPacket == nil {
		return target, nil
	}

	// Create a new packet with the new transfer packet data.
	// Re-serialize the packet data with the base addresses.
	newData, err := cdc.MarshalJSON(newTransferData)
	if err != nil {
		return target, err
	}

	// Create the new packet.
	th := packet.GetTimeoutHeight()
	*newPacket = channeltypes.NewPacket(
		newData, packet.GetSequence(),
		packet.GetSourcePort(), packet.GetSourceChannel(),
		packet.GetDestPort(), packet.GetDestChannel(),
		clienttypes.NewHeight(th.GetRevisionNumber(), th.GetRevisionHeight()),
		packet.GetTimeoutTimestamp(),
	)

	return target, nil
}
