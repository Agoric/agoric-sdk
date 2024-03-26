package vm

import (
	"context"
	"fmt"
	"sync"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const VmPortMappingContextKey = sdk.ContextKey("vm-port-mapping")

type AgdServer struct {
	currentCtx    context.Context
	mtx           sync.Mutex
	lastPort      int
	portToHandler map[int]PortHandler
	portToName    map[int]string
	nameToPort    map[string]int
}

var wrappedEmptySDKContext = sdk.WrapSDKContext(
	sdk.Context{}.WithContext(context.Background()),
)

func NewAgdServer() *AgdServer {
	return &AgdServer{
		currentCtx:    wrappedEmptySDKContext,
		mtx:           sync.Mutex{},
		portToHandler: make(map[int]PortHandler),
		portToName:    make(map[int]string),
		nameToPort:    make(map[string]int),
	}
}

func (s *AgdServer) SetControllerContext(ctx sdk.Context) func() {
	// We are only called by the controller, so we assume that it is billing its
	// own meter usage.
	s.mtx.Lock()
	defer s.mtx.Unlock()
	s.currentCtx = sdk.WrapSDKContext(ctx.WithGasMeter(sdk.NewInfiniteGasMeter()))
	return func() {
		s.mtx.Lock()
		defer s.mtx.Unlock()
		s.currentCtx = wrappedEmptySDKContext
	}
}

func (s *AgdServer) getContextAndHandler(port int) (context.Context, PortHandler) {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	ctx := s.currentCtx
	handler := s.portToHandler[port]
	return ctx, handler
}

// ReceiveMessage is the method the VM calls in order to have agd receive a
// Message.
func (s *AgdServer) ReceiveMessage(msg *Message, reply *string) error {
	ctx, handler := s.getContextAndHandler(msg.Port)
	if handler == nil {
		return fmt.Errorf("unregistered port %d", msg.Port)
	}
	resp, err := handler.Receive(ctx, msg.Data)
	*reply = resp
	return err
}

func (s *AgdServer) GetPort(name string) int {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	return s.nameToPort[name]
}

func (s *AgdServer) RegisterPortHandler(name string, portHandler PortHandler) int {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	s.lastPort++
	s.portToHandler[s.lastPort] = NewProtectedPortHandler(portHandler)
	s.portToName[s.lastPort] = name
	s.nameToPort[name] = s.lastPort
	return s.lastPort
}

func (s *AgdServer) UnregisterPortHandler(portNum int) error {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	delete(s.portToHandler, portNum)
	name := s.portToName[portNum]
	delete(s.portToName, portNum)
	delete(s.nameToPort, name)
	return nil
}
