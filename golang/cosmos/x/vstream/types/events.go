package types

import (
	"encoding/base64"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	EventTypeStateChange = "state_change"

	AttributeKeyStoreKey      = "store_key"
	AttributeKeyStoreSubkey   = "store_subkey"
	AttributeKeyUnprovedValue = "unproved_value"
)

func NewStateChangeEvent(storeKey string, subkey, value []byte) sdk.Event {
	// Bytes are base64-encoded.
	return sdk.NewEvent(
		EventTypeStateChange,
		sdk.NewAttribute(AttributeKeyStoreKey, storeKey),
		sdk.NewAttribute(AttributeKeyStoreSubkey, base64.StdEncoding.EncodeToString(subkey)),
		sdk.NewAttribute(AttributeKeyUnprovedValue, base64.StdEncoding.EncodeToString(value)),
	)
}
