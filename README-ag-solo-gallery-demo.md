# The ag-solo Tool

The `ag-solo` tool is used to create and launch a SwingSet vat-machine. This
machine can interact with the outside world either through a WebSocket
listening port, or by exchanging messages with a Cosmos-SDK -based
vat-machine (launched with `ag-chain-cosmos`).

## Build from source

```
$ make
$ npm install
```

(the `make` step builds some Go libraries and header files, which are
necessary for `npm install` to compile the `.so` extensions for node.js to
load, so it must be performed before `npm install` can work)

## Create a vat-machine

Choose a working directory for the machine. We'll call it `$BASEDIR`.

```
$ bin/ag-solo init $BASEDIR
$ cd $BASEDIR
$ ../bin/ag-solo start
```

Now open a web browser and point it at `http://localhost:8000`

## REPL

The browser page provides a basic REPL (Read-Eval-Print Loop). You can type
strings of Javascript (SES expressions, to be precise) into the text box and
they will be transmitted into the vat-machine for evaluation. The results are
displayed in the history log above the text box.

The SES expressions are evaluated in a confined environment which has access
to a couple of interesting objects (and more to come). These are available as
properties of the `home` object. 

## Gallery Pixel Demo

In this Gallery Demo, the goal is to be able to create designs in a
pixel canvas. You start with access to the gallery and a handful of
methods that allow you to obtain pixels, color them, and buy or sell
pixels. 

To access the gallery, type `home.gallery` in the REPL. `home.gallery` is a
Presence. In the SwingSet environment, Presences are remote references to objects on
other vats. To invoke them, use the `E` wrapper. For example, the
first thing you might want to do is tap the gallery faucet to get a
pixel for free: 

```js
home.myFirstPixelPayment = E(home.gallery).tapFaucet()
```

This returns a presence for the pixel that you receive from the
faucet, and saves it under `home.myFirstPixelPayment`.

To color the pixel, we need to split the pixel into "transfer" and
"use" rights. The right to use the pixel means that you can color it,
and we'll be using it to color. 

```js
home.transferAndUseRights = E(home.gallery).transformToTransferAndUse(home.myFirstPixelPayment)
```

```js
home.useAndTransfer.useRightPayment
```

------
This returns a Promise for the result. The REPL will update the history log
when the Promise resolves (to the number `100`, in this case).

For ease of experimentation, the contents of the history log are available in
the `history` object:

```js
1 + 2
# now history[0] = 3
history[0] + 4
# now history[1] = 7
E(home.purse).getBalance()
# history[2] starts out as a Promise, but is quickly replaced by 100
history[2] + 1
# history[3] = 101
```

A basic Purse transfer looks like this:

```js
E(home.purse).getIssuer()
E(history[1]).makeEmptyPurse()
# now history[2] is an empty Purse
E(history[2]).deposit(20, home.purse)
# that transfers 20 units from home.purse into the history[2] purse
E(history[2]).getBalance()
# should say 20
E(home.purse).getBalance()
# should say 80
```

## Modifying the demo objects

The `lib/ag-solo/vats/` directory contains the source code for all the Vats
created in the solo vat-machine. The actual filenames are enumerated in
`lib/ag-solo/init-basedir.js`, so if you add a new Vat, be sure to add it to
`init-basedir.js` too.

The objects added to `home` are created in `lib/ag-solo/vats/bootstrap.js`.

The REPL handler is in `lib/ag-solo/vats/vat-http.js`.

The HTML frontend code is pure JS/DOM (no additional libraries yet), in
`lib/ag-solo/html/index.html` and `lib/ag-solo/html/main.js`.
