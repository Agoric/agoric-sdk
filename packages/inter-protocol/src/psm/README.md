# Parity Stability Module

The Parity Stability Module supports efficiently minting/burning a stable token
at a specified fixed ratio to a reference stable token, which thereby acts as an
anchor to provide additional stability. For flexible economic policies, the fee
percentage for trading into and out of the stable token are specified
separately.


## Usage

See the [Smart Wallet integration test](/packages/inter-protocol/test/smartWallet/test-psm-integration.js) for how it's used.

End users can make swap offers in the CLI or GUI.

### CLI

See [psm.js command file](/packages/agoric-cli/src/commands/psm.js) and its [integration test script](/packages/agoric-cli/scripts/).

```mermaid
sequenceDiagram

actor user

participant cli as Dapp PSM
participant disk
participant B as Cosmos / Swingset <br/> bridge
participant C as smart-wallet<br/>contract
participant PSM as PSM<br/>contract

user ->> cli: create a swap offer
user -->> disk: write offer data
user ->> cli: sign and send swap offer
disk -->> cli: read offer data
cli ->> B: spending transaction
B ->> C: unpack ocap data
C ->> PSM: route offer
```


### GUI

The GUI is in https://github.com/Agoric/dapp-psm

It introduces another layer of communication (between the dapp and Wallet UI):

```mermaid
sequenceDiagram

actor user

participant dapp as Dapp PSM
participant ls as localStorage
participant ui as Wallet UI
participant Keplr
participant B as Cosmos / Swingset <br/> bridge
participant C as smart-wallet<br/>contract
participant PSM as PSM<br/>contract

user ->> dapp: configure offer and click
dapp ->> ls: write offer record
ls ->> ui: notify offer record
ui ->> user: display offer for signing
user ->> ui: click Approve
ui ->> Keplr: request signing
Keplr ->> user: pop-up transaction
user ->> Keplr: click to sign
Keplr ->> B: spending transaction
B ->> C: unpack ocap data
C ->> PSM: route offer
```
