package types

import (
	"bytes"
	"testing"
)

func Test_Key_Encoding(t *testing.T) {
	tests := []struct {
		name     string
		childStr string
		key      []byte
	}{
		{
			name:     "empty key is prefixed",
			childStr: "",
			key:      []byte("0\x00"),
		},
		{
			name:     "some key string",
			childStr: "some",
			key:      []byte("1\x00some"),
		},
		{
			name:     "dot-separated",
			childStr: "some.child.grandchild",
			key:      []byte("3\x00some\x00child\x00grandchild"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if key := PathToEncodedKey(tt.childStr); !bytes.Equal(key, tt.key) {
				t.Errorf("pathToKey(%q) = %v, want %v", tt.childStr, key, tt.key)
			}
			if childStr := EncodedKeyToPath(tt.key); childStr != tt.childStr {
				t.Errorf("keyToString(%v) = %q, want %q", tt.key, childStr, tt.childStr)
			}
		})
	}
}
