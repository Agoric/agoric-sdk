package keeper

import (
	"bytes"
	"testing"
)

func Test_Key_Encoding(t *testing.T) {
	tests := []struct {
		name   string
		keyStr string
		key    []byte
	}{
		{
			name:   "empty key matches prefix",
			keyStr: "",
			key:    keyPrefix,
		},
		{
			name:   "empty key string (actual)",
			keyStr: "",
			key:    []byte{':'},
		},
		{
			name:   "some key string",
			keyStr: "some",
			key:    []byte{':', 's', 'o', 'm', 'e'},
		},
		{
			name:   "key prefix immutable",
			keyStr: "",
			key:    keyPrefix,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if key := stringToKey(tt.keyStr); !bytes.Equal(key, tt.key) {
				t.Errorf("stringToKey(%q) = %v, want %v", tt.keyStr, key, tt.key)
			}
			if keyStr := keyToString(tt.key); keyStr != tt.keyStr {
				t.Errorf("keyToString(%v) = %q, want %q", tt.key, keyStr, tt.keyStr)
			}
		})
	}
}
