# Pixel Gallery Demo

This demo is roughly based on [Reddit's
r/Place](https://en.wikipedia.org/wiki/Place_(Reddit)), but has a 
number of additional features that showcase the unique affordances of
the Agoric platform, including: higher-order contracts, easy creation
of new assets, and safe code reusability.

## Pixels
The base asset is a pixelList (an array of
pixels). The holder of a pixel is able to change the color of the
pixel by splitting the pixelList up into the useRight (the right to
color) and a transfer right (the right to transfer the pixel). The
holder of the use right can send a payment of the right to the Gallery
(the creator the pixel canvas) to color. 

When the transfer right is sent as a payment to another user, that
user can do turn the transfer right in to the Gallery to get a full
pixel back, thus revoking any coloring rights that may be in the hands
of other users. 

## Dust
We also have a currency called Dust (Pixel Dust, heh heh). Users do not start out with any Dust - they only start out with access to the faucet. As described in more detail below, they can sell the pixels that they get for free from the faucet back to the Gallery in order to earn Dust.  

## Gallery

At the start, all pixels and all color rights are held by the Gallery.
The Gallery provides a faucet that allows users to get a pixel at a
time for free. The Gallery has a queue of all the pixels ordered by
least recently used (at the start, this is all the pixels in an
unusual order), and takes from the front of this LRU queue to provide a pixel to the faucet.

The user eventually gets a handful of pixels from the faucet (in the
future, this would be rate-limited per user), but at this point, it is unlikely that the user is able to draw
anything interesting. Hopefully, this will incentivize them to keep
playing (“gotta collect them all”) rather than deter them. 

## Further Gameplay

In order to amass the pixels that they want in order to draw their masterpiece, the user will need to sell some pixels to get our currency, Dust. (The user does not start out with any money.) Our Gallery will always buy pixels back, but it values pixels near the center much more than pixels on the periphery. This will incentivize people to keep hitting the faucet because they might get a “valuable” pixel in the next go. 

In order to sell pixels, the user must create an ask in our order book. The Gallery will always have a bid (request to buy) for all pixels, but the price should be relatively low, lower than selling to another user (this will need to be done after experimentation, not sure how to guarantee it now). 

Now that the user has some Dust, how can they buy their pixels? The pixel canvas will have an on-hover attribute that shows the x, y coordinates of the hovered-over pixel. The user should be able to look at the canvas to see what they want to buy, and record the coordinates. Then, they can create a bid in the order book for that pixel or sell it to the Gallery for a relatively low price. 

The user should be able to put their color rights into our ERTP covered call and other contract components and create things like options. 

For examples of how the ERTP assets work, see the gallery tests.
