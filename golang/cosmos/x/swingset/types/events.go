package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// swingset module event types
const (
	EventTypeStorage = "storage"

	AttributeKeyPath  = "path"
	AttributeKeyValue = "value"

	AttributeValueCategory = ModuleName
)

// NewStorageSetEvent constructs a new storage change sdk.Event
// nolint: interfacer
func NewStorageEvent(path, value string) sdk.Event {
	return sdk.NewEvent(
		EventTypeStorage,
		sdk.NewAttribute(AttributeKeyPath, path),
		sdk.NewAttribute(AttributeKeyValue, value),
	)
}
