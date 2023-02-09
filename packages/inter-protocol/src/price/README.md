# Price oracles

This directory contains the `fluxAggregator.js` contract which takes prices as
input and outputs a best known price. There are multiple ways to get the price,
including a PriceAuthority interface.


## Usage

See the [Smart Wallet integration test](/packages/inter-protocol/test/smartWallet/test-oracle-integration.js) for how it's used.

Oracle operates can make PushPrice offers in the CLI. There is no GUI.

### CLI

See [oracle.js command file](/packages/agoric-cli/src/commands/oracle.js) and its [integration test script](/packages/agoric-cli/test/agops-oracle-smoketest.sh).

```mermaid
sequenceDiagram

actor user

participant cli as Oracle
participant disk
participant B as Cosmos / Swingset <br/> bridge
participant C as smart-wallet<br/>contract
participant flux as Flux Aggregator<br/>contract

user ->> cli: create a PushPrice offer
user -->> disk: write offer data
user ->> cli: sign and send PushPrice offer
disk -->> cli: read offer data
cli ->> B: spending transaction
B ->> C: unpack ocap data
C ->> flux: route offer
```

### Reading feed

Once a new price has been determined, it's published on the aggregator's public topics.

```mermaid
sequenceDiagram

actor user

participant cli as Oracle<br>query command
participant flux as Flux Aggregator<br/>contract
participant B as Cosmos / Swingset <br/> bridge
participant RPC as validator RPC

flux ->> B: publish a PriceDescription
B ->> RPC: write into Merkle tree
user ->> cli: query the current price
cli ->> RPC: request head of vstorage for the feed's path
RPC -->> cli: return the value
cli -->> user: display pretty version
```
