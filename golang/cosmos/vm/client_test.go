package vm_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/rpc"
	"testing"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

type errorWrapper struct {
	Error string `json:"error"`
}

// ConnectVMClientCodec creates an RPC client codec and a sender to the
// in-process implementation of the VM.
func ConnectVMClientCodec(ctx context.Context, sendFunc func(int, int, string)) (*vm.ClientCodec, vm.Sender) {
	vmClientCodec := vm.NewClientCodec(ctx, sendFunc)
	vmClient := rpc.NewClientWithCodec(vmClientCodec)

	sendToNode := func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error) {
		if jsonRequest == "shutdown" {
			return "", vmClientCodec.Close()
		}

		msg := vm.Message{
			Port:       1,
			NeedsReply: needReply,
			Data:       jsonRequest,
		}
		var reply string
		err = vmClient.Call(vm.ReceiveMessageMethod, msg, &reply)
		return reply, err
	}

	return vmClientCodec, sendToNode
}

type Fixture struct {
	SendToNode vm.Sender
	SendToGo   func(port int, msgStr string) string
	ReplyToGo  func(replyPort int, isError bool, respStr string) int
}

func NewFixture(t *testing.T) *Fixture {
	f := &Fixture{}
	agdServer := vm.NewAgdServer()

	sendFunc := func(port int, reply int, str string) {
		if port != 1 {
			t.Errorf("unexpected node port %d", port)
		}
		switch str {
		case "ping":
			time.AfterFunc(100*time.Millisecond, func() {
				fmt.Printf("sendFunc: reply=%d, str=%s\n", reply, str)
				if reply != 0 {
					f.ReplyToGo(reply, false, "pong")
				}
			})
		case "wait":
			time.AfterFunc(300*time.Millisecond, func() {
				fmt.Printf("sendFunc: reply=%d, str=%s\n", reply, str)
				if reply != 0 {
					f.ReplyToGo(reply, false, "done-waiting")
				}
			})
		default:
			t.Errorf("Unexpected message %s", str)
		}
	}

	vmClientCodec, sendToNode := ConnectVMClientCodec(
		context.Background(),
		sendFunc,
	)

	f.SendToNode = sendToNode
	f.SendToGo = func(port int, msgStr string) string {
		fmt.Println("Send to Go", msgStr)
		var respStr string
		message := &vm.Message{
			Port:       int(port),
			NeedsReply: true,
			Data:       msgStr,
		}

		err := agdServer.ReceiveMessage(message, &respStr)
		if err == nil {
			return respStr
		}

		// fmt.Fprintln(os.Stderr, "Cannot receive from controller", err)
		errResp := errorWrapper{
			Error: err.Error(),
		}
		respBytes, err := json.Marshal(&errResp)
		if err != nil {
			panic(err)
		}
		return string(respBytes)
	}

	f.ReplyToGo = func(replyPort int, isError bool, respStr string) int {
		if err := vmClientCodec.Receive(replyPort, isError, respStr); err != nil {
			return 1
		}
		return 0
	}

	return f
}

func TestClient_oneOutbound(t *testing.T) {
	f := NewFixture(t)

	// Try one blocking call.
	ret, err := f.SendToNode(context.Background(), true, "ping")
	if err != nil {
		t.Error(err)
	}
	if ret != "pong" {
		t.Errorf("ping want pong, got %s", ret)
	}
}

func TestClient_NoReply(t *testing.T) {
	f := NewFixture(t)
	response, err := f.SendToNode(context.Background(), false, "ping")
	if err != nil {
		t.Fatal(err)
	}
	if response != "<no-reply-requested>" {
		t.Fatalf("unexpected no-reply acknowledgement %q", response)
	}
}

func TestClient_ShortBg(t *testing.T) {

	f := NewFixture(t)

	// Try a short background call with a long overlapping call.
	done := make(chan struct{})
	go func() {
		defer close(done)
		ret, err := f.SendToNode(context.Background(), true, "ping")
		if err != nil {
			t.Error(err)
		}
		if ret != "pong" {
			t.Errorf("ping want pong, got %s", ret)
		}
	}()

	ret, err := f.SendToNode(context.Background(), true, "wait")
	if err != nil {
		t.Error(err)
	}
	if ret != "done-waiting" {
		t.Errorf("wait want done-waiting, got %s", ret)
	}
	<-done
}

func TestClient_LongBg(t *testing.T) {

	f := NewFixture(t)

	// Try a long background call with a short overlapping call.
	done := make(chan struct{})
	go func() {
		defer close(done)
		ret, err := f.SendToNode(context.Background(), true, "wait")
		if err != nil {
			t.Error(err)
		}
		if ret != "done-waiting" {
			t.Errorf("ping want done-waiting, got %s", ret)
		}
	}()

	ret, err := f.SendToNode(context.Background(), true, "ping")
	if err != nil {
		t.Error(err)
	}
	if ret != "pong" {
		t.Errorf("wait want pong, got %s", ret)
	}
	<-done
}
