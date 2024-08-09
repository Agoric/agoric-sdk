package types

import (
	"strings"

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

func NewStateChangeEvent(storeName string, subkey string, value string) sdk.Event {
	// This is a hack to allow CONTAINS event queries to match the
	// beginning or end of the subkey, enabling a handy OR of changes to a
	// vstorage path's immediate children.
	//
	// FIXME: add string value ranges to Tendermint event queries instead.
	anchoredKey := strings.Join([]string{AnchoredKeyStart, subkey, AnchoredKeyEnd}, "")

	return sdk.NewEvent(
		EventTypeStateChange,
		sdk.NewAttribute(AttributeKeyStoreName, storeName),
		sdk.NewAttribute(AttributeKeyStoreSubkey, subkey),
		sdk.NewAttribute(AttributeKeyAnchoredKey, anchoredKey),
		sdk.NewAttribute(AttributeKeyUnprovedValue, value),
	)
}
