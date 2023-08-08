package types

import (
	"encoding/json"
	"fmt"
)

type KVEntry struct {
	key   string
	value *string
}

func NewKVEntry(key string, value string) KVEntry {
	return KVEntry{key, &value}
}

func NewKVEntryWithNoValue(key string) KVEntry {
	return KVEntry{key, nil}
}

// UnmarshalKVEntry interprets its argument as a [key: string, value?: string | null]
// JSON array and returns a corresponding KVEntry.
// The key must be a string, and the value (if present) must be a string or null.
func UnmarshalKVEntry(msg json.RawMessage) (entry KVEntry, err error) {
	var generic [2]interface{}
	err = json.Unmarshal(msg, &generic)

	if err != nil {
		return
	}

	key, ok := generic[0].(string)
	if !ok {
		err = fmt.Errorf("invalid entry key: %q", generic[0])
		return
	}

	switch generic[1].(type) {
	case string:
		entry = NewKVEntry(key, generic[1].(string))
	case nil:
		entry = NewKVEntryWithNoValue(key)
	default:
		err = fmt.Errorf("invalid entry value: %q", generic[1])
	}
	return
}

func (entry KVEntry) HasValue() bool {
	return entry.value != nil
}

func (entry KVEntry) Key() string {
	return entry.key
}

func (entry KVEntry) Value() *string {
	return entry.value
}

func (entry KVEntry) StringValue() string {
	if entry.value != nil {
		return *entry.value
	} else {
		return ""
	}
}
