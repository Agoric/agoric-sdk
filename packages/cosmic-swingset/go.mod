module github.com/Agoric/cosmic-swingset

go 1.14

require (
	github.com/bartekn/go-bip39 v0.0.0-20171116152956-a05967ea095d // indirect
	github.com/confio/ics23-iavl v0.6.0 // indirect
	github.com/cosmos/cosmos-sdk v0.34.4-0.20201010134738-15324920548c
	github.com/enigmampc/btcutil v1.0.3-0.20200723161021-e2fb6adb2a25 // indirect
	github.com/gibson042/canonicaljson-go v1.0.3 // indirect
	github.com/gogo/protobuf v1.3.1
	github.com/golang/mock v1.4.4 // indirect
	github.com/gorilla/mux v1.8.0
	github.com/grpc-ecosystem/grpc-gateway v1.15.0
	github.com/otiai10/copy v1.2.0
	github.com/pelletier/go-toml v1.8.0 // indirect
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.7.1 // indirect
	github.com/rakyll/statik v0.1.7
	github.com/regen-network/cosmos-proto v0.3.0 // indirect
	github.com/snikch/goodman v0.0.0-20171125024755-10e37e294daa
	github.com/spf13/afero v1.2.2 // indirect
	github.com/spf13/cast v1.3.1
	github.com/spf13/cobra v1.0.0
	github.com/spf13/viper v1.7.1
	github.com/stretchr/testify v1.6.1
	github.com/tendermint/go-amino v0.16.0
	github.com/tendermint/tendermint v0.34.0-rc4.0.20201005135527-d7d0ffea13c6
	github.com/tendermint/tm-db v0.6.2
	google.golang.org/genproto v0.0.0-20200825200019-8632dd797987
	google.golang.org/grpc v1.32.0
	google.golang.org/protobuf v1.25.0 // indirect
	grpc.go4.org v0.0.0-20170609214715-11d0a25b4919
	rsc.io/quote/v3 v3.1.0 // indirect
)

// Silence a warning on MacOS
replace github.com/keybase/go-keychain => github.com/99designs/go-keychain v0.0.0-20191008050251-8e49817e8af4

replace github.com/gogo/protobuf => github.com/regen-network/protobuf v1.3.2-alpha.regen.4

// At least until https://github.com/cosmos/cosmos-sdk/pull/7507 is landed
replace github.com/cosmos/cosmos-sdk => github.com/agoric-labs/cosmos-sdk v0.34.4-0.20201011165527-9684bf64c2db

// For testing against a local cosmos-sdk or tendermint
// replace github.com/cosmos/cosmos-sdk => ../../../forks/cosmos-sdk
// replace github.com/tendermint/tendermint => ../../../forks/tendermint
