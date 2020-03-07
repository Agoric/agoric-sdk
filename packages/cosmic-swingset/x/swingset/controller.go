package swingset

import (
	"errors"
	"fmt"
)

type PortHandler interface {
	Receive(string) (string, error)
}

var portToHandler = map[int]PortHandler{}
var lastPort = 0

func RegisterPortHandler(portHandler PortHandler) int {
	lastPort++
	portToHandler[lastPort] = portHandler
	return lastPort
}
func UnregisterPortHandler(portNum int) error {
	delete(portToHandler, portNum)
	return nil
}

func ReceiveFromController(portNum int, msg string) (string, error) {
	handler := portToHandler[portNum]
	if handler == nil {
		return "", errors.New(fmt.Sprintf("Unregistered port %d", portNum))
	}
	return handler.Receive(msg)
}
