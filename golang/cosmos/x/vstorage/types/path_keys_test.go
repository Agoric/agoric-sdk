package types

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
			name:   "empty key is prefixed",
			keyStr: "",
			key:    []byte("0\x00"),
		},
		{
			name:   "some key string",
			keyStr: "some",
			key:    []byte("1\x00some"),
		},
		{
			name:   "dot-separated",
			keyStr: "some.child.grandchild",
			key:    []byte("3\x00some\x00child\x00grandchild"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if key := PathToEncodedKey(tt.keyStr); !bytes.Equal(key, tt.key) {
				t.Errorf("pathToKey(%q) = %v, want %v", tt.keyStr, key, tt.key)
			}
			if keyStr := KeyToPath(tt.key); keyStr != tt.keyStr {
				t.Errorf("keyToString(%v) = %q, want %q", tt.key, keyStr, tt.keyStr)
			}
		})
	}
}
