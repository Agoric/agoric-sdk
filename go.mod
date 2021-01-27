module github.com/Agoric/agoric-sdk

go 1.14

require (
	github.com/btcsuite/btcd v0.21.0-beta
	github.com/btcsuite/btcutil v1.0.2
	github.com/cosmos/cosmos-sdk v0.40.1
	github.com/ethereum/go-ethereum v1.9.22
	github.com/gogo/protobuf v1.3.3
	github.com/gorilla/mux v1.8.0
	github.com/grpc-ecosystem/grpc-gateway v1.16.0
	github.com/pkg/errors v0.9.1
	github.com/rakyll/statik v0.1.7
	github.com/spf13/cast v1.3.1
	github.com/spf13/cobra v1.1.1
	github.com/tendermint/tendermint v0.34.3
	github.com/tendermint/tm-db v0.6.3
	google.golang.org/genproto v0.0.0-20210114201628-6edceaf6022f
	google.golang.org/grpc v1.35.0
)

// Silence a warning on MacOS
replace github.com/keybase/go-keychain => github.com/99designs/go-keychain v0.0.0-20191008050251-8e49817e8af4

replace github.com/gogo/protobuf => github.com/regen-network/protobuf v1.3.2-alpha.regen.4

// At least until tendermint v0.34.4 is released.
// replace github.com/tendermint/tendermint => github.com/agoric-labs/tendermint v0.33.1-dev2.0.20210126214117-87803b32fbb4

// At least until cosmos-sdk v0.40.0-rc3 is released.
// replace github.com/cosmos/cosmos-sdk => github.com/agoric-labs/cosmos-sdk v0.34.4-0.20201011165527-9684bf64c2db

// For testing against a local cosmos-sdk or tendermint
// replace github.com/cosmos/cosmos-sdk => ../forks/cosmos-sdk
// replace github.com/tendermint/tendermint => ../forks/tendermint
