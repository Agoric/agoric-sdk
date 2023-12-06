package vtransfer_test

import (
	"encoding/json"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/keeper"
	simappparams "github.com/cosmos/ibc-go/v4/testing/simapp/params"
	"github.com/tendermint/tendermint/libs/log"
	dbm "github.com/tendermint/tm-db"

	ibctesting "github.com/cosmos/ibc-go/v4/testing"
	"github.com/cosmos/ibc-go/v4/testing/simapp"
)

type TestApp struct {
	*simapp.SimApp
	vTransferKeeper keeper.Keeper
}

func NewTestApp(encCdc simappparams.EncodingConfig) *TestApp {
	db := dbm.NewMemDB()
	app := simapp.NewSimApp(log.NewNopLogger(), db, nil, true, map[int64]bool{}, simapp.DefaultNodeHome, 5, encCdc, simapp.EmptyAppOptions{})
	return &TestApp{
		SimApp:          app,
		vTransferKeeper: keeper.Keeper{},
	}
}

func SetupTransferTestingApp() (ibctesting.TestingApp, map[string]json.RawMessage) {
	encCdc := simapp.MakeTestEncodingConfig()
	app := NewTestApp(encCdc)
	return app, simapp.NewDefaultGenesisState(encCdc.Marshaler)
}

func init() {
	ibctesting.DefaultTestingAppInit = SetupTransferTestingApp
}

func NewTransferPath(chainA, chainB *ibctesting.TestChain) *ibctesting.Path {
	path := ibctesting.NewPath(chainA, chainB)
	path.EndpointA.ChannelConfig.PortID = ibctesting.TransferPort
	path.EndpointB.ChannelConfig.PortID = ibctesting.TransferPort

	return path
}

func GetTransferSimApp(chain *ibctesting.TestChain) *simapp.SimApp {
	app, ok := chain.App.(*simapp.SimApp)
	if !ok {
		panic("not transfer app")
	}

	return app
}
