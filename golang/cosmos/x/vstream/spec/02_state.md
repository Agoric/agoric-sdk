<!--
order: 2
-->

# State

## Stream Cell

- StreamCell: `any -> ProtocolBuffer(streamCell)`

A stream cell consists of the stream metadata and published states for a given block.

+++ https://github.com/Agoric/agoric-sdk/blob/mfig-vstream/golang/cosmos/proto/agoric/types/stream.proto#L8

## Stream Position

- StreamPosition: `any -> ProtocolBuffer(streamPosition)`

A stream position is a pointer to a specific value offset in a specific stream
cell.

+++ https://github.com/Agoric/agoric-sdk/blob/mfig-vstream/golang/cosmos/proto/agoric/types/stream.proto#L46
