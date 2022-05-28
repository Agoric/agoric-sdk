package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// swingset module event types
const (
	LegacyEventTypeStorage = "storage"

	LegacyAttributeKeyPath  = "path"
	LegacyAttributeKeyValue = "value"

	AttributeValueCategory = ModuleName
)

// NewLegacyStorageEvent constructs a new storage change sdk.Event
// nolint: interfacer
func NewLegacyStorageEvent(path, value string) sdk.Event {
	return sdk.NewEvent(
		LegacyEventTypeStorage,
		sdk.NewAttribute(LegacyAttributeKeyPath, path),
		sdk.NewAttribute(LegacyAttributeKeyValue, value),
	)
}
