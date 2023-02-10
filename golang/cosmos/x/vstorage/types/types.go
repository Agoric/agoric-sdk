package types

import (
	"encoding/json"
	"fmt"
)

func NewData() *Data {
	return &Data{}
}

func NewChildren() *Children {
	return &Children{}
}

type StorageEntry struct {
	path  string
	value *string
}

func NewStorageEntry(path string, value string) StorageEntry {
	return StorageEntry{path, &value}
}

func NewStorageEntryWithNoData(path string) StorageEntry {
	return StorageEntry{path, nil}
}

// UnmarshalStorageEntry interprets its argument as a [key: string, value?: string | null]
// JSON array and returns a corresponding StorageEntry.
// The key must be a string, and the value (if present) must be a string or null.
func UnmarshalStorageEntry(msg json.RawMessage) (entry StorageEntry, err error) {
	var generic [2]interface{}
	err = json.Unmarshal(msg, &generic)

	if err != nil {
		return
	}

	path, ok := generic[0].(string)
	if !ok {
		err = fmt.Errorf("invalid storage entry path: %q", generic[0])
		return
	}

	switch generic[1].(type) {
	case string:
		entry = NewStorageEntry(path, generic[1].(string))
	case nil:
		entry = NewStorageEntryWithNoData(path)
	default:
		err = fmt.Errorf("invalid storage entry value: %q", generic[1])
	}
	return
}

func (se StorageEntry) HasData() bool {
	return se.value != nil
}

func (se StorageEntry) Path() string {
	return se.path
}

func (se StorageEntry) StringValue() string {
	if se.value != nil {
		return *se.value
	} else {
		return ""
	}
}
