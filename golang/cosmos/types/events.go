package types

import (
	"bytes"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	EventTypeStateChange = "state_change"

	AttributeKeyStoreName     = "store"
	AttributeKeyStoreSubkey   = "key"
	AttributeKeyAnchoredKey   = "anckey"
	AttributeKeyUnprovedValue = "value"

	// We chose \1 so that it is not a valid character in a vstorage path.
	AnchoredKeyStart = "\x01"
	AnchoredKeyEnd   = AnchoredKeyStart
)

func NewStateChangeEvent(storeName string, subkey, value []byte) sdk.Event {
	// This is a hack to allow CONTAINS event queries to match the
	// beginning or end of the subkey, enabling a handy OR of changes to a
	// vstorage path's immediate children.
	//
	// FIXME: add string value ranges to Tendermint event queries instead.
	anchoredKey := bytes.Join([][]byte{
		[]byte(AnchoredKeyStart),
		subkey,
		[]byte(AnchoredKeyEnd),
	}, []byte{})

	return sdk.NewEvent(
		EventTypeStateChange,
		sdk.NewAttribute(AttributeKeyStoreName, storeName),
		sdk.NewAttribute(AttributeKeyStoreSubkey, string(subkey)),
		sdk.NewAttribute(AttributeKeyAnchoredKey, string(anchoredKey)),
		sdk.NewAttribute(AttributeKeyUnprovedValue, string(value)),
	)
}
