
# ICS-27 Interchain Accounts

Sequence diagrams for Interchain Accounts based on [ics-027-interchain-accounts/README.md#9ffb1d2](https://github.com/cosmos/ibc/blob/9ffb1d26d3018b6efda546189ec7e43d56d23da3/spec/app/ics-027-interchain-accounts/README.md).

### IBC Connection Creation

_Prerequisite to creating a channel._

```mermaid
sequenceDiagram
    participant CC as Chain A
    participant R as Relayer
    participant HC as Chain B

    CC->>R: ConnOpenInit(ClientId, CounterpartyClientId, Version)
    R->>HC: ConnOpenTry(ClientId, CounterpartyClientId, Version, CounterpartyVersion)
    HC-->>R: ConnOpenTry(Version)
    R->>CC: ConnOpenAck(ConnectionId, Version)
    CC-->>R: ConnOpenAck
    R->>HC: ConnOpenConfirm(ConnectionId)
```

Mock Testing: 
 - on `ConnOpenInit`, return `ConnOpenAck`

### ICA Channel Creation

```mermaid
sequenceDiagram
    participant CC as Controller Chain
    participant R as Relayer
    participant HC as Host Chain

    CC->>CC: RegisterInterchainAccount()
    CC->>R: ChannelOpenInit(Order, ConnectionHops, PortIdentifier, ChannelIdentifier, Version)
    R->>HC: ChannelOpenTry(Order, ConnectionHops, PortIdentifier, ChannelIdentifier, Version)
    HC->>HC: RegisterInterchainAccount(CounterpartyPortIdentifier)
    HC-->>R: ChannelOpenTry(Version)
    R->>CC: ChannelOpenAck(PortIdentifier, ChannelIdentifier, CounterpartyVersion)
    CC->>CC: SetInterchainAccountAddress(PortID, Address)
    CC->>CC: SetActiveChannelID(PortIdentifier, ConnectionID, ChannelIdentifier)
    CC-->>R: ChannelOpenAck
    R->>HC: ChannelOpenConfirm(PortIdentifier, ChannelIdentifier)
    HC->>HC: SetActiveChannelID(CounterpartyPortIdentifier, ConnectionID, ChannelIdentifier)
```

Mock Testing: 
 - on `ChannelOpenInit`, return `ChannelOpenAck`

### ICA Transaction

```mermaid
sequenceDiagram
    participant CC as Controller Chain
    participant R as Relayer
    participant HC as Host Chain

    CC->>R: SendPacket(PacketData)
    R->>HC: onRecvPacket(Packet)
    HC->>HC: Deserialize and validate packet data
    alt Successful deserialization and validation
        HC->>HC: AuthenticateTx(msgs)
        HC->>HC: ExecuteTx(msgs)
        HC-->>R: Acknowledgement(result)
    else Error
        HC-->>R: ErrorAcknowledgement(error)
    end
    R->>CC: onAcknowledgePacket(Packet, Acknowledgement)
    CC->>CC: Handle acknowledgement
```

Mock Testing: 
 - on `SendPacket`, return `onAcknowledgePacket`

### ICA Channel Closing (from Controller)

```mermaid
sequenceDiagram
    participant CC as Controller Chain
    participant R as Relayer
    participant HC as Host Chain

    CC->>R: ChanCloseInit(PortID, ChannelID)
    R->>HC: ChanCloseConfirm(PortID, ChannelID)
    HC->>HC: OnChanCloseConfirm(portID, channelID)
    HC-->>R: Success
    R->>CC: ChanCloseConfirm
    CC->>CC: CloseChannel(PortID, ChannelID)
```
Mock Testing: 
 - on `ChanCloseInit`, return `ChanCloseConfirm`

### ICA Channel Closing (from Host - Unexpected closure)

```mermaid
sequenceDiagram
    participant CC as Controller Chain
    participant R as Relayer
    participant HC as Host Chain
    
    HC-->>R: Channel closed unexpectedly
    R->>CC: ChanCloseConfirm(PortID, ChannelID)
    CC->>CC: OnChanCloseConfirm
    CC-->>R: Acknowledge closure

    Note over CC: Handle unexpected closure
    Note over HC: Unexpected channel closure (e.g., timeout in ORDERED channel)
```
Mock Testing: 
 - `ChanCloseConfirm` event is emitted

### ICA Channel Reactivation

```mermaid
sequenceDiagram
    participant CC as Controller Chain
    participant R as Relayer
    participant HC as Host Chain

    Note over CC,HC: Existing ICA channel expires or closes
    CC->>CC: Channel closes or times out
    CC->>R: ChannelOpenInit(Order, ConnectionHops, PortIdentifier, ChannelIdentifier, Version)
    Note right of CC: Reusing the same PortIdentifier and ConnectionID
    R->>HC: ChannelOpenTry(Order, ConnectionHops, PortIdentifier, ChannelIdentifier, Version)
    HC->>HC: Verify PortIdentifier and ConnectionID match the previous active channel
    HC->>HC: Verify the channel is in CLOSED state
    HC->>HC: Verify the new channel has the same order and version as the previous channel
    HC-->>R: ChannelOpenTry(Version)
    R->>CC: ChannelOpenAck(PortIdentifier, ChannelIdentifier, CounterpartyVersion)
    CC->>CC: Verify the CounterpartyVersion matches the previous active channel
    CC->>CC: SetActiveChannelID(PortIdentifier, ConnectionID, ChannelIdentifier)
    CC-->>R: ChannelOpenAck
    R->>HC: ChannelOpenConfirm(PortIdentifier, ChannelIdentifier)
    HC->>HC: SetActiveChannelID(CounterpartyPortIdentifier, ConnectionID, ChannelIdentifier)
```

Mock Testing: 
 - on `ChannelOpenInit`, return `ChannelOpenAck`
    - n.b. testing should verify `SetActiveChannelID` flow on CC side


### Testing Mocks Summary

 - IBC Connection Creation: on ConnOpenInit, return ConnOpenAck
 - ICA Channel Creation: on ChannelOpenInit, return ChannelOpenAck
 - ICA Transaction: on SendPacket, return onAcknowledgePacket
 - ICA Channel Reactivation: on ChannelOpenInit, return ChannelOpenAck
    - testing should verify SetActiveChannelID flow on CC side
