package conv

import (
	"encoding/json"
)

// UnmarshalJSONString parses the JSON-encoded string data into v
// See "encoding/json".Unmarshal
func UnmarshalJSONString(data string, v any) error {
	return json.Unmarshal([]byte(data), v)
}

// ValidJSONString reports whether data is a valid JSON encoded string.
// See "encoding/json".Valid
func ValidJSONString(data string) bool {
	return json.Valid([]byte(data))
}

// MarshalToJSONString marshals a value to a JSON encoded string
// See "encoding/json".Marshal
func MarshalToJSONString(v any) (string, error) {
	bz, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bz), nil
}
