package vm

import (
	"fmt"
)

type AgdServer struct{}

func NewAgdServer() *AgdServer {
	return &AgdServer{}
}

// ReceiveMessage is the method the VM calls in order to have agd receive a
// Message.
func (s AgdServer) ReceiveMessage(msg *Message, reply *string) error {
	handler := portToHandler[msg.Port]
	if handler == nil {
		return fmt.Errorf("unregistered port %d", msg.Port)
	}
	resp, err := handler.Receive(controllerContext, msg.Data)
	*reply = resp
	return err
}
