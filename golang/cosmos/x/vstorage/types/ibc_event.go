package types

import (
	"encoding/base64"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	EventTypeIbcPublish = "ibc_publish"

	AttributeKeyFriendly = "friendly"
	AttributeKeyKey      = "key"
	AttributeKeyValue    = "value"
)

func NewIbcPublishEvent(storeKey, friendly string, key, value []byte) sdk.Event {
	// Bytes are base64-encoded.
	return sdk.NewEvent(
		EventTypeIbcPublish,
		sdk.NewAttribute(sdk.AttributeKeyModule, storeKey),
		sdk.NewAttribute(AttributeKeyFriendly, friendly),
		sdk.NewAttribute(AttributeKeyKey, base64.StdEncoding.EncodeToString(key)),
		sdk.NewAttribute(AttributeKeyValue, base64.StdEncoding.EncodeToString(value)),
	)
}
