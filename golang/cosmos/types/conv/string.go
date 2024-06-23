package conv

import (
	"encoding/json"
	"unsafe"
)

// UnsafeStrToBytes uses unsafe to convert a string into a byte slice. Returned bytes
// must not be altered after this function is called as it will cause a segmentation fault.
// The byte slice can outlive the source string.
func UnsafeStrToBytes(s string) []byte {
	if s == "" {
		return []byte{}
	}
	p := unsafe.StringData(s)
	return unsafe.Slice(p, len(s))
}

// UnsafeBytesToStr makes a zero allocation conversion from []byte -> string.
// It should only be used when the underlying slice does not change. The
// returned string can safely outlive the source byte slice.
func UnsafeBytesToStr(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	p := unsafe.SliceData(b)
	return unsafe.String(p, len(b))
}

// UnmarshalJSONString parses the JSON-encoded string data into v
// See "encoding/json".Unmarshal
func UnmarshalJSONString(data string, v any) error {
	return json.Unmarshal(UnsafeStrToBytes(data), v)
}

// ValidJSONString reports whether data is a valid JSON encoded string.
// See "encoding/json".Valid
func ValidJSONString(data string) bool {
	return json.Valid(UnsafeStrToBytes(data))
}

// MarshalToJSONString marshals a value to a JSON encoded string
// See "encoding/json".Marshal
func MarshalToJSONString(v any) (string, error) {
	bz, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	// The bytes in the slice won't change anymore, safe to
	// make a string from them
	return UnsafeBytesToStr(bz), nil
}
