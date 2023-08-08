package types

import (
	"encoding/json"
	"fmt"
)

var _ json.Marshaler = &KVEntry{}
var _ json.Unmarshaler = &KVEntry{}

// KVEntry represents a string key / string value pair, where the value may be
// missing, which is different from an empty value.
// The semantics of a missing value are purpose-dependent rather than specified
// here, but frequently correspond with deletion/incompleteness/etc.
// A KVEntry with an empty key is considered invalid.
type KVEntry struct {
	key   string
	value *string
}

// NewKVEntry creates a KVEntry with the provided key and value
func NewKVEntry(key string, value string) KVEntry {
	return KVEntry{key, &value}
}

// NewKVEntryWithNoValue creates a KVEntry with the provided key and no value
func NewKVEntryWithNoValue(key string) KVEntry {
	return KVEntry{key, nil}
}

// UnmarshalJSON updates a KVEntry from JSON text corresponding with a
// [key: string, value?: string | null] shape, or returns an error indicating
// invalid input.
// The key must be a non-empty string, and the value (if present) must be a
// string or null.
//
// Implements json.Unmarshaler
// Note: unlike other methods, this accepts a pointer to satisfy
// the Unmarshaler semantics.
func (entry *KVEntry) UnmarshalJSON(input []byte) (err error) {
	var generic []*string
	err = json.Unmarshal(input, &generic)
	if err != nil {
		return err
	}

	length := len(generic)

	if generic == nil {
		return fmt.Errorf("KVEntry cannot be null")
	}
	if length != 1 && length != 2 {
		return fmt.Errorf("KVEntry must be an array of length 1 or 2 (not %d)", length)
	}

	key := generic[0]
	if key == nil || *key == "" {
		return fmt.Errorf("KVEntry key must be a non-empty string: %v", key)
	}

	var value *string
	if length == 2 {
		value = generic[1]
	}

	entry.key = *key
	entry.value = value

	return nil
}

// MarshalJSON encodes the KVEntry into a JSON array of [key: string, value?: string],
// with the value missing (array length of 1) if the entry has no value.
//
// Implements json.Marshaler
func (entry KVEntry) MarshalJSON() ([]byte, error) {
	if !entry.IsValidKey() {
		return nil, fmt.Errorf("cannot marshal invalid KVEntry")
	}
	if entry.value != nil {
		return json.Marshal([2]string{entry.key, *entry.value})
	} else {
		return json.Marshal([1]string{entry.key})
	}
}

// IsValidKey returns whether the KVEntry has a non-empty key.
func (entry KVEntry) IsValidKey() bool {
	return entry.key != ""
}

// Key returns the string key.
func (entry KVEntry) Key() string {
	return entry.key
}

// HasValue returns whether the KVEntry has a value or not.
func (entry KVEntry) HasValue() bool {
	return entry.value != nil
}

// Value returns a pointer to the string value or nil if the entry has no value.
func (entry KVEntry) Value() *string {
	return entry.value
}

// StringValue returns the string value, or the empty string if the entry has no value.
// Note that the result therefore does not differentiate an empty string value from no value.
func (entry KVEntry) StringValue() string {
	if entry.value != nil {
		return *entry.value
	}
	return ""
}
