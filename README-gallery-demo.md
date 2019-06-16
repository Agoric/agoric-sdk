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
E(home.gallery).tapFaucet()
```

This returns a presence for the pixel that you receive from the
faucet and saves it under `history[0]`.

To color the pixel, we need to split the pixel into "transfer" and
"use" rights. The right to use the pixel means that you can color it,
and we'll be using it to color. 

The following commands show a pixel being obtained from the faucet,
being transformed into transfer and use rights, coloring the pixel by
using the 'use' right, and selling a pixel to the gallery through a
escrow smart contract.  

```
E(home.gallery).tapFaucet()
E(home.gallery).transformToTransferAndUse(history[0])
history[1].useRightPayment
E(home.gallery).changeColor(history[2], '#FF69B4')
E(home.gallery).tapFaucet()
E(history[4]).getBalance()
E(home.gallery).pricePixelAmount(history[5])
E(home.gallery).sellToGallery(history[5])
history[7].inviteP
history[7].host
E(history[9]).redeem(history[8])
E(history[10]).offer(history[4])
E(home.gallery).getIssuers()
history[12].pixelIssuer
history[12].dustIssuer
E(history[13]).makeEmptyPurse()
E(history[14]).makeEmptyPurse()
E(home.gallery).collectFromGallery(history[10], history[16],
history[15], 'my escrow')
```
