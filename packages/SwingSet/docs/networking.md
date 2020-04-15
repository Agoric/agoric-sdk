= Network API =

Suitably-empowered code inside a vat can access a "network API" that works vaguely like the BSD socket API. This code can open a listening port on various networking stacks, initiate connections to remote ports, send and receive data over these connections, and finally close the connection and/or ports.

The type of connection is limited by the host in which the vat is running. Chain-based machines must operate in a platonic realm of replicated consensus, so their network options are limited to protocols like IBC, which allow one gestalt chain to talk to other chain-like entities. Each such entity is defined by an evolving set of consensus rules, which typically include a current set of validator public keys and a particular history of hashed block identifiers.

TODO: IBC uses "Connection" to mean a chain-to-chain pathway, and "Channel" to mean a Port-to-Port pathway within a specific Connection. https://github.com/cosmos/ics/blob/master/ibc/1_IBC_TERMINOLOGY.md#connection . This is unfortunate, because IBC "Channels" correspond most precisely to TCP "connections", and most discussions of network APIs (including my own, below) will talk about "connections" extensively. For now, our IBC implementation can only use pre-established IBC Connections, and provides no means for user-level code to create new IBC Connections at runtime. But user-level code can create new IBC Channels at any time. The terminology confusion will be most obvious in the section on "Accepting an Inbound Connection", where the user code is really accepting an inbound *Channel*.

These IBC connections will terminate in IBC-aware code on either end. These endpoints might be traditional (static) IBC handlers (such as an ICS-20 token transfer module), or dynamic IBC handlers (e.g. running in a SwingSet vat). SwingSet vat code that wants to speak to vat code in a different SwingSet machine would not use the IBC connection directly: instead it would simply perform normal eventual-send operations (`target~.foo(args)`) and let the "CapTP" promise-pipelining layer handle the details. But vat code which wants to speak to an ICS-20 handler in some other chain would need to use this layer.

Vats which live inside a solo machine are able to use traditional networking layers, like TCP, HTTP, and WebSockets. This enables them to communicate with e.g. browser-side UI frontends that use WebSockets to query the vat for order status. These connections do not have to follow normal ocap rules, so vat code which accept them must provide their own authentication and access control protections.

Solo machines may be able to talk to chains and vice versa using specialized protocols. This will be used by CapTP to provide ocap messaging between these heterogeneous machine types.

== The agoric-sdk User Local Port ==

Each user of the Agoric testnet gets their own personal IBC listening port. You can access this `Port` object in `home.ibcport`, and you can learn it's local address by calling `home.ibcport~.getLocalAddress()`, which will give you something like `/ibc/*/ordered/port8312`.

This is currently the only way for user code to get a `Port`. In the future, specialized communication-layer code will have other ways to create `Port` objects.

`home.ibcport~.addListener()`

`home.ibcport~.connect()`

== Connecting to a Remote Port ==

To establish a channel, you must start with a local `Port` object, and you must know the name of the remote endpoint. The remote endpoint will have a name like `/ibc/$CONNECTIONNAME/ordered/$PORTNAME` (where `ibc` and `ordered` are literal strings, spelled just like that, but `$CONNECTIONNAME` and `$PORTNAME` are placeholders for arbitrary values that will vary from one endpoint to another).

You must also prepare a `ChannelHandler` object to manage the channel you're about to create. This has a number of methods which will be called when the things happen to the channel, including packets arriving. This is described below.

Then you will call the `connect()` method on your local `Port`. This will return a `Promise` that will fire with a new `Channel` object, on which you can send data. Your `ChannelHandler` will be notified about the new channel, and will receive inbound data from the other side.

```js
home.ibcport~.connect(endpoint, channelHandler)
  .then(channel => doSomethingWithChannel(channel));
```

== Opening a Listening Port and Accepting an Inbound Connection ==

The other side of `connect()` is a "listening port". These ports are waiting for inbound connections to be established.

To get a listening port, you need a `Peer` object (TODO: can user code get one?) and ask it to `bind()` to an endpoint. You can either provide a specific port name, or allow the API to allocate a random one for you. The endpoint specifies the type of connection that this port will be able to accept (IBC, TCP, etc), and some properties of that connection. `bind()` uses a "multiaddress" to encode this information.

```js
// ask for a random allocation
peer~.bind('/ibc/*/ordered`)
  .then(port => usePort(port));
//
// or ask for a specific port name
peer~.bind('/ibc/*/ordered/my-cool-port-name`)
  .then(port => usePort(port));
```

IBC has named "Connections" which connect two specific chains. When you bind a port to `/ibc/*`, any connected chain can initiate a connection to this port. If you know a connection name and want to limit the port to only using that one, you can bind to `/ibc/that-great-connection-name/ordered` instead.

You can ask the `Port` object this returns for it's local address, which is especially useful if you had asked for a random allocation (since otherwise you have no way to know what address you got):

```js
port~.getLocalAddress().then(localAddress => useIt(localAddress))
```

Once the port is bound, you must call `addListener` to mark it as ready for inbound connections. You must provide this with a `ListenHandler` object, which has methods to react to listening events. As with `ChannelHandler`, these methods are all optional.

* `onListen(port, handler)`: called when the port starts listening
* `onAccept(port, remote, handler)`: called when a new channel has been accepted
* `onError(port, rejection, handler)`: called if the port is no longer able to accept channels, such as if the Connection to the remote chain has failed, perhaps because a consensus failure was observed
* `onRemove(port, handler)`: called when the `ListenHandler` is being removed

Once your `ChannelHandler` is prepared, call `addListener`:

```js
port.addListener(handler).then(() => console.log('listener is active'))
```

Of all the methods, `onAccept` is the interesting one. It is called with a `remote` endpoint, which tells you the address of the `Port` at the other end, where someone else called `.connect`. You can use this to decide if you want to accept the connection, or what sort of authority to exercise in response to messages arriving therein.

If you choose to accept, your `onAccept` method must return a `Promise` that fires with a `ChannelHandler`. This will be used just like the one you would pass into `connect()`. To decline, throw an error.


== Sending Data ==

The Networking API (at least for IBC) provides a "record pipe", in which each packet is transmitted intact over the network, requiring no additional framing to distinguish where one packet ends and the next one begins. This is in contrast to the "byte pipe" provided by a TCP connection, where you must typically prepend length headers to establish framing boundaries.

Once you have a `Channel` object, you send data by calling its `send` method:

```js
channel.send('data');
```

TODO: `send` actually returns a Promise (for more `Bytes`), which contains the ACK data for this message. Is not clear that our SwingSet IBC implementation is in a position to return anything useful here: by the time the handler vat has received the message, the opportunity to provide response data in the ACK message has passed. However other implementations (e.g. an ICS-20 handler in a Cosmos-SDK -based chain) might put relevant data here.

TODO: the exact type of the data is not clear. Strings should certainly work, but ideally we'd accept Node.js `Buffer` objects, or Javascript `ArrayBuffer` objects. Unfortunately neither can be serialized by our current inter-vat marshalling code.

== Receiving Data: The ChannelHandler ==

You must provide each open channel with a `ChannelHandler` object, where you write methods that will be called when various things happen to the channel. You can share a single handler object between multiple channels, if you like, or you can make a separate one for each.

You can omit any of the methods and those events will simply be ignored. All these methods include the Channel object as the first argument, and the `ChannelHandler` itself as the last argument, which might help if you want to share a common handler function among multiple channels.

* `onOpen(channel, handler)`: this is called when the channel is established, which tells you that the remote end has successfully accepted the connection request
* `onReceive(channel, packetBytes, handler)`: this is called each time the remote end sends a packet full of data
* `onClose(channel, reason, handler)`: this is called when the channel is closed, either because one side wanted it to close, or because an error occurred

TODO: the `reason` in `onclose` is marked as `reason?` in the TypeScript file: is it optional?

`onReceive` is the most important method. Each time the remote end sends a packet, your `onReceive` method will be called with the data inside that packet (TODO: probably as a String, but ideally as a Buffer or ArrayBuffer so it can contain arbitrary bytes).

TODO: the return value of `onReceive` is nominally a Promise for the ACK data of the message (and should thus appear as the eventual resolution of the Promise returned by `channel.send()` on the other side). However the ACK data can only appear in the block which includes the transaction that delivered the message, so there is a limited time window during which this data can be successfully delivered, and there is no guarantee that `onReceive` will return a Promise that resolves in time. I don't know how we should recommend using the return value.

== Closing the Channel ==

When a given Channel has ceased to be useful, you should close it:

```js
channel.close();
```

This initiates a shutdown. The `ChannelHandler` on both sides will eventually see their `onClose()` methods be called. TODO: what will their `reason` arguments be? It will allow them to distinguish an intentional `onClose()` from some error condition.

== Closing the Port When You're Done ==

When you no longer wish to receive connections on a port, you can remove the listener:

```js
port.removeListener(handler).then(() => console.log('removed'));
```

TODO: must provide the handler to remove it? Or would `removeListener()` suffice?
