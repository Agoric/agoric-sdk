package jsonrpcconn_test

import (
	"fmt"
	"net"
	"net/rpc"
	"net/rpc/jsonrpc"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm/jsonrpcconn"
)

/*
type testConn struct {
	input  *bytes.Buffer
	output *bytes.Buffer
	done   chan struct{}
}

func newTestConn(input string) io.ReadWriteCloser {
	return testConn{
		input:  bytes.NewBufferString(input),
		output: new(bytes.Buffer),
		done:   make(chan struct{}),
	}
}

func (tc testConn) Read(p []byte) (int, error) {
	n, err := tc.input.Read(p)
	if err == io.EOF {
		<-tc.done
	}
	return n, err
}

func (tc testConn) Write(p []byte) (int, error) {
	return tc.output.Write(p)
}

func (tc testConn) Close() error {
	close(tc.done)
	return nil
}

func TestMux(t *testing.T) {
	input := `{"id": 1, "method": "foo", "params": [1, 2]}
	{"id": "aaa", "result": true, "error": null}
	{"id": null, "method": "bar", "params": ["string", 3, false]}`
	tc := newTestConn(input)
	client, server := jsonrpcconn.ClientServerConn(tc)
	client.Read
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {

	}()
	wg.Wait()
} */

type Args struct {
	A, B int
}

type Arith struct{}

func (a *Arith) Add(args Args, reply *int) error {
	*reply = args.A + args.B
	return nil
}

func (a *Arith) Mul(args Args, reply *int) error {
	*reply = args.A * args.B
	return nil
}

func (a *Arith) Oops(args Args, reply *int) error {
	return fmt.Errorf("oops")
}

func TestJsonRPC(t *testing.T) {
	left, right := net.Pipe()
	leftClientConn, leftServerConn := jsonrpcconn.ClientServerConn(left)
	rightClientConn, rightServerConn := jsonrpcconn.ClientServerConn(right)

	leftClient := jsonrpc.NewClient(leftClientConn)
	leftServer := rpc.NewServer()
	err := leftServer.RegisterName("foo", new(Arith))
	if err != nil {
		t.Fatal(err)
	}
	go leftServer.ServeCodec(jsonrpc.NewServerCodec(leftServerConn))

	rightClient := jsonrpc.NewClient(rightClientConn)
	rightServer := rpc.NewServer()
	err = rightServer.RegisterName("bar", new(Arith))
	if err != nil {
		t.Fatal(err)
	}
	go rightServer.ServeCodec(jsonrpc.NewServerCodec(rightServerConn))

	var reply int
	err = leftClient.Call("bar.Add", Args{1, 2}, &reply)
	if err != nil {
		t.Error(err)
	}
	if reply != 3 {
		t.Errorf("bar.Add want 3, got %d", reply)
	}

	err = rightClient.Call("foo.Mul", Args{2, 3}, &reply)
	if err != nil {
		t.Error(err)
	}
	if reply != 6 {
		t.Errorf("foo.Mul want 6, got %d", reply)
	}

	err = leftClient.Call("bar.Oops", Args{7, 11}, &reply)
	if err == nil {
		t.Errorf("bar.Oops want error, got reply %d", reply)
	} else if err.Error() != "oops" {
		t.Errorf(`bar.Oops want error "oops", got "%s"`, err.Error())
	}
	leftClient.Close()
	rightClient.Close()
}
