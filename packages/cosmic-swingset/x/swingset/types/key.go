package types

const (
	// module name
	ModuleName = "swingset"

	// StoreKey to be used when creating the KVStore
	StoreKey = ModuleName
)

var (
	DataPrefix   = []byte(StoreKey + "/data")
	KeysPrefix   = []byte(StoreKey + "/keys")
	EgressPrefix = []byte(StoreKey + "/egress")
)
