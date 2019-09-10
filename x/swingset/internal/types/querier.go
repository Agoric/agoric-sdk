package types

import "encoding/json"

// Query Result Payload for a storage query
type QueryResStorage struct {
	Value string `json:"value"`
}

// implement fmt.Stringer
func (r QueryResStorage) String() string {
	return r.Value
}

// Query Result Payload for a keys query
type QueryResKeys struct {
	Keys []string `json:"keys"`
}

// implement fmt.Stringer
func (r QueryResKeys) String() string {
	bytes, err := json.Marshal(r.Keys)
	if err != nil {
		return ""
	}
	return string(bytes)
}
