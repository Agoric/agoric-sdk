package vm

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type ControllerContext struct {
	Context               sdk.Context
	IBCChannelHandlerPort int
}

type ControllerAdmissionMsg interface {
	sdk.Msg
	CheckAdmissibility(sdk.Context, interface{}) error

	// GetInboundMsgCount returns the number of Swingset messages which will
	// be added to the inboundQueue.
	GetInboundMsgCount() int32

	// IsHighPriority returns whether the message should be considered for
	// high priority processing, including bypass of some inbound checks
	// and queueing on higher priority queues.
	IsHighPriority(sdk.Context, interface{}) (bool, error)
}

// Jsonable is a value, j, that can be passed through json.Marshal(j).
type Jsonable interface{}

// ActionPusher enqueues data for later consumption by the controller.
type ActionPusher func(ctx sdk.Context, action Jsonable) error

var controllerContext ControllerContext

type PortHandler interface {
	Receive(*ControllerContext, string) (string, error)
}

var portToHandler = make(map[int]PortHandler)
var portToName = make(map[int]string)
var nameToPort = make(map[string]int)
var lastPort = 0

func SetControllerContext(ctx sdk.Context) func() {
	// We are only called by the controller, so we assume that it is billing its
	// own meter usage.
	controllerContext.Context = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	return func() {
		controllerContext.Context = sdk.Context{}
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
		return "", fmt.Errorf("unregistered port %d", portNum)
	}
	return handler.Receive(&controllerContext, msg)
}
