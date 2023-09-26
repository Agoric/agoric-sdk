/*
Package jsonrpcconn provides a way to multiplex an io stream into two
streams where incoming JSON-RPC requests go to one stream and incoming
JSON-RPC responses go to another. Outputs are merged.

The JSON-RPCv1 protocol is peer-to-peer, but the implementation in the Go
standard library only supports client-server. By multiplexing a single
io.ReadWriteCloser stream into separate server (receives requests) and
client (receives responses) streams, two RPC halves can share the same
underlying connection.
*/
package jsonrpcconn

import (
	"encoding/json"
	"io"
)

// jsonRpcMsg can unmarshal either a JSON-RPC
// request or response object.
type jsonRpcMsg struct {
	Error  json.RawMessage   `json:"error"`
	Id     json.RawMessage   `json:"id"`
	Method *string           `json:"method"`
	Params []json.RawMessage `json:"params"`
	Result json.RawMessage   `json:"result"`
}

// mux holds the underlying connection and the pipe reader/writer
// pairs for the server (request) and client (response) sides.
// Any protocol error or closing any channel will cause shutdown.
type mux struct {
	conn       io.ReadWriteCloser
	reqReader  *io.PipeReader
	reqWriter  *io.PipeWriter
	respReader *io.PipeReader
	respWriter *io.PipeWriter
}

func newMux(conn io.ReadWriteCloser) mux {
	reqReader, reqWriter := io.Pipe()
	respReader, respWriter := io.Pipe()
	m := mux{
		conn:       conn,
		reqReader:  reqReader,
		reqWriter:  reqWriter,
		respReader: respReader,
		respWriter: respWriter,
	}
	go m.input()
	return m
}

func (m mux) input() {
	var err error
	dec := json.NewDecoder(m.conn)
	for {
		// read the next JSON value, preserve its wire format
		var raw json.RawMessage
		err = dec.Decode(&raw)
		if err != nil {
			break
		}

		// parse as JSON-RPC
		var msg jsonRpcMsg
		err = json.Unmarshal(raw, &msg)
		if err != nil {
			break
		}

		// send to one of the outputs
		if msg.Method != nil {
			// presume a request, the consumer will handle any missing fields
			_, err = m.reqWriter.Write(raw)
		} else {
			// presume a response, the consumer will handle any missing fields
			_, err = m.respWriter.Write(raw)
		}
		if err != nil {
			break
		}
	}
	m.reqWriter.CloseWithError(err)
	m.respWriter.CloseWithError(err)
	m.conn.Close()
}

// clientChan is a view of the mux for the client channel.
type clientChan mux

// Close implements the io.Closer interface.
func (c clientChan) Close() error {
	return c.conn.Close()
}

// Read implements the io.Reader interface.
func (c clientChan) Read(p []byte) (int, error) {
	return c.respReader.Read(p)
}

// Write implements the io.Writer interface.
func (c clientChan) Write(p []byte) (int, error) {
	return c.conn.Write(p)
}

// serverChan is a view of the mux for the server channel.
type serverChan mux

// Close implements the io.Closer interface.
func (s serverChan) Close() error {
	return s.conn.Close()
}

// Read implements the io.Reader interface.
func (s serverChan) Read(p []byte) (int, error) {
	return s.reqReader.Read(p)
}

// Write implements the io.Writer interface.
func (s serverChan) Write(p []byte) (int, error) {
	return s.conn.Write(p)
}

// ClientServerConn multiplexes an input/output stream for the JSON-RPCv1
// protocol into streams specific for client traffic and server traffic.
// Full JSON objects must be written atomically to either stream to
// interleave correctly.
func ClientServerConn(conn io.ReadWriteCloser) (clientConn io.ReadWriteCloser, serverConn io.ReadWriteCloser) {
	m := newMux(conn)
	clientConn = clientChan(m)
	serverConn = serverChan(m)
	return
}

type conn struct {
	rd io.ReadCloser
	wr io.WriteCloser
}

// Close implments the io.Closer interface.
func (e conn) Close() error {
	e.rd.Close()
	return e.wr.Close()
}

// Read implements the io.Reader interface.
func (e conn) Read(p []byte) (int, error) {
	return e.rd.Read(p)
}

// Write implements the io.Writer interface.
func (e conn) Write(p []byte) (int, error) {
	return e.wr.Write(p)
}

// NewConn returns a connection from a reader and a writer.
func NewConn(rd io.ReadCloser, wr io.WriteCloser) io.ReadWriteCloser {
	return conn{rd: rd, wr: wr}
}
