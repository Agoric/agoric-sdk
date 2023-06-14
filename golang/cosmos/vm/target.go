package vm

import (
	"errors"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type MessageKind int

const BootstrapPort Port = 1

const (
	Unspecified MessageKind = iota
	Send
	Reply
	ReplyError
)

type Message struct {
	Kind MessageKind
	Port Port
	ReplyPort Port
	Data string
}

type ControllerContext struct {
	Context               sdk.Context
	StoragePort           Port
	IBCChannelHandlerPort Port
}

type PortHandler interface {
	Receive(*ControllerContext, string) (string, error)
}

type goReturn struct { 
	str string
	err error
}

type Port int

type Target struct {
	context *ControllerContext
	lastPort *Port
	lastReply *Port
	portToHandler map[Port]PortHandler
	portToName map[Port]string
	nameToPort map[string]Port
	replies map[Port]chan goReturn
	rawSend func (msg Message) error
}

func NewTarget(rawSend func (msg Message) error) Target {
	lastPort := new(Port)
	*lastPort = BootstrapPort
	lastReply := new(Port)
	*lastReply = BootstrapPort
	return Target{
		context: new(ControllerContext),
		lastPort: lastPort,
		lastReply: lastReply,
		portToHandler: make(map[Port]PortHandler),
		portToName: make(map[Port]string),
		nameToPort: make(map[string]Port),
		replies: make(map[Port]chan goReturn),
		rawSend: rawSend,
	}
}

func (t Target) Send(msg Message) error {
	if msg.Port == 0 {
		// No port specified, so discard.
		return nil
	}
	return t.rawSend(msg)
}

func (t Target) Call(port Port, needReply bool, data string) (string, error) {
	// fmt.Printf("Calling: %v, %v, %v\n", port, needReply, data)
	var rPort Port
	if needReply {
		(*t.lastReply)++
		rPort = *t.lastReply
		t.replies[rPort] = make(chan goReturn)
	}

	// Send the message
	msg := Message{
		Kind: Send,
		Port: port,
		ReplyPort: rPort,
		Data: data,
	}
	if err := t.Send(msg); err != nil {
		return "", err
	}
	
	if !needReply {
		// Return immediately
		return "<no-reply-requested>", nil
	}

	// Block the sending goroutine while we wait for the reply
	reply := <- t.replies[rPort]
	delete(t.replies, rPort)
	return reply.str, reply.err
}

func (t Target) receiveReply(gr goReturn, replyPort Port) error {
	returnCh := t.replies[replyPort]
	// fmt.Printf("Received reply: %v %v %v\n", gr, replyPort, returnCh)
	if returnCh == nil {
		// Unexpected reply.
		// This is okay, since the caller decided not to wait for a reply.
		return nil
	}
	returnCh <- gr
	return nil
}

func (t Target) Receive(msg Message) error {
	return t.Dispatch(msg, t.Send)
}

func (t Target) Dispatch(msg Message, send func(Message) error) error {
	// fmt.Printf("Dispatching message: %v\n", msg)
	switch msg.Kind {
	case Send:
		handler := t.portToHandler[msg.Port]
		if handler == nil {
			return fmt.Errorf("unregistered port %d", msg.Port)
		}
		data, err := handler.Receive(t.context, msg.Data)
		reply := Message{Port: msg.ReplyPort}
		if err == nil {
			reply.Data = data
			reply.Kind = Reply
		} else {
			reply.Data = err.Error()
			reply.Kind = ReplyError
		}
		return send(reply)
	case Reply:
		gr := goReturn{str: msg.Data}
		return t.receiveReply(gr, msg.Port)
	case ReplyError:
		gr := goReturn{err: errors.New(msg.Data)}
		return t.receiveReply(gr, msg.Port)
	case Unspecified:
		return fmt.Errorf("unspecified message kind: %d", msg.Kind)
	default:
		return fmt.Errorf("unknown message kind: %d", msg.Kind)
	}
}

func (t Target) SetContext(ctx sdk.Context) func() {
	// We are only called by the controller, so we assume that it is billing its
	// own meter usage.
	t.context.Context = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	return func() {
		t.context.Context = sdk.Context{}
	}
}

func (t Target) GetPort(name string) Port {
	return t.nameToPort[name]
}

func (t Target) RegisterPortHandler(name string, portHandler PortHandler) Port {
	(*t.lastPort)++
	last := *t.lastPort
	t.portToHandler[last] = portHandler
	t.portToName[last] = name
	t.nameToPort[name] = last
	return last
}

func (t Target) UnregisterPortHandler(portNum Port) error {
	delete(t.portToHandler, portNum)
	name := t.portToName[portNum]
	delete(t.portToName, portNum)
	delete(t.nameToPort, name)
	return nil
}
