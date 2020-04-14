package swingset

import (
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	channelexported "github.com/cosmos/cosmos-sdk/x/ibc/04-channel/exported"
)

type ControllerContext struct {
	Keeper                Keeper
	Context               sdk.Context
	CurrentPacket         channelexported.PacketI
	StoragePort           int
	IBCChannelHandlerPort int
}

var controllerContext ControllerContext

type PortHandler interface {
	Receive(*ControllerContext, string) (string, error)
}

var portToHandler = make(map[int]PortHandler)
var portToName = make(map[int]string)
var nameToPort = make(map[string]int)
var lastPort = 0

func SetControllerContext(ctx sdk.Context) func() {
	controllerContext.Context = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	return func() {
		controllerContext.Context = sdk.Context{}
	}
}

func SetControllerKeeper(keeper Keeper) func() {
	controllerContext.Keeper = keeper
	return func() {
		controllerContext.Keeper = Keeper{}
	}
}

func GetPort(name string) int {
	return nameToPort[name]
}

func RegisterPortHandler(name string, portHandler PortHandler) int {
	lastPort++
	portToHandler[lastPort] = portHandler
	portToName[lastPort] = name
	nameToPort[name] = lastPort
	return lastPort
}
func UnregisterPortHandler(portNum int) error {
	delete(portToHandler, portNum)
	name := portToName[portNum]
	delete(portToName, portNum)
	delete(nameToPort, name)
	return nil
}

func ReceiveFromController(portNum int, msg string) (string, error) {
	handler := portToHandler[portNum]
	if handler == nil {
		return "", errors.New(fmt.Sprintf("Unregistered port %d", portNum))
	}
	return handler.Receive(&controllerContext, msg)
}
