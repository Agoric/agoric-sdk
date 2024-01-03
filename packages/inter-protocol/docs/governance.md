# Inter Protocol Governance

Inter Protocol is subject to two forms of governance. Like the entire chain, it's subject to BLDer DAO governance. This is sometimes called the "big hammer" because the DAO can approve running any code in the core ("core eval").

There is also governance by an configurable electorate using a contract governor (see [@agoric/governance](../../governance)). The _governor_ contract allows the electorate to execute governed API methods or set governed parameters of the _governed_ contract. In the conventional configuration of the Inter Protocol contracts there is electorate, which is called the "Economic Committee".

The *Economic Committee* (EC) can enact proposals through contracts governed by their charter. A contract is put under EC governance by adding its governance facet to the EC charter creatorFacet. At the time of writing, governed contracts include:

- [auctioneer](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/proposals/committee-proposal.js#L100-L102)
- [price feed](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/proposals/price-feed-proposal.js#L219-L224)
- [psm](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/proposals/startPSM.js#L189-L193)
- [reserve](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/proposals/committee-proposal.js#L89-L94)
- [smartWallet provisionPool](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/vats/src/core/startWalletFactory.js#L248-L253)
- [vault factory](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/proposals/committee-proposal.js#L95-L97)


## API Methods

The Zoe contract framework allows contracts to set filters on what offers they accept, by matching a string in the offer description. The governed contracts above grant to EC the ability to pause the creation of offers by calling `setOfferFilter` to set a list of strings. (Offers are blocked when their 'descriptions are an exact match or a prefix match to one of the strings in the list.  Other criteria are not yet supported](https://github.com/Agoric/agoric-sdk/issues/7317).)

Specific contracts also grant to the EC permission to invoke other API methods:
- Oracle / Price feed / fluxAggregator
-- [addOracles](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/price/fluxAggregatorContract.js#L113-L121)
-- [removeOracles]https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/price/fluxAggregatorContract.js#L123-L131
- reserve
-- [burnFeesToReduceShortfall](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/reserve/assetReserve.js#L281)

## Parameters

This sections documents the Governance-controlled parameters of the major Inter Protocol contracts.

Below, for each contract you will find the governance keys for the various parameters,
the type of each parameter, and an indicator of whether that parameter is described in
the Inter Protocol Whitepaper, v0.8.  

### Vault Factory - Director
([source](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/vaultFactory/params.js#L35-L39))

| Governance Key     | Type              | WP? |
| ------------------ | :---------------- | --- |
| MinInitialDebt     | Amount            |     |
| ReferencedUI       | String            | No  |
| ChargingPeriod     | RelativeTime      |     |
| RecordingPeriod    | RelativeTime      |     |


### Vault Manager

([source](https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/vaultFactory/params.js#L96-L101))

| Governance Key     | Type              | WP? |
| ------------------ | :---------------- | --- |
| DebtLimit          | Amount            | Yes |
| InterestRate       | Ratio             | Yes |
| LiquidationPadding | Ratio             |     |
| LiquidationMargin  | Ratio             | Yes |
| LiquidationPenalty | Ratio             | Yes |
| MintFee            | Ratio             | Yes |

From Inter Protocol Whitepaper, v0.8:  
>Governance determines the approved collateral types: the crypto assets that can be used as collateral in vaults. In addition, it sets and manages the parameters associated with each collateral type based on the risk of the asset. These include the total debt limit, the collateralization ratio, the stability fee, and the liquidation penalty. 

Note that the "stability fee" described in the Whitepaper comprises both InterestRate and MintFee.

### Parity Stability Mechanism (PSM)

In `packages/inter-protocol/src/psm/psm.js`:

| Governance Key     | Type                | WP? |
| ------------------ | :------------------ | --- |
| WantMintedFee      | Ratio               | N/A |
| GiveMintedFee      | Ratio               | N/A |
| MintLimit          | Amount              | N/A |

The Inter Protocol Whitepaper v0.8 does not describe the governance parameters
for this contract.

### Provision Pool

In `packages/inter-protocol/src/provisionPool.js`:

| Governance Key          | Type    | WP? |
| ----------------------- | :------ | --- |
| PerAccountInitialAmount | Amount  | N/A |

### Auctioneer

([source](
https://github.com/Agoric/agoric-sdk/blob/5cbc847618dfb22f80e4641e5221b80e6daa109a/packages/inter-protocol/src/auction/params.js#L58-L68)))

| Governance Key            | Type          | WP? |
| ------------------------- | :------------ | --- |
| StartFrequency            | RelativeTime  | N/A |
| ClockStep                 | RelativeTime  | N/A |
| StartingRate              | BasisPoints   | N/A |
| LowestRate                | BasisPoints   | N/A |
| DiscountStep              | BasisPoints   | N/A |
| AuctionStartDelay         | RelativeTime  | N/A |
| PriceLockPeriod           | RelativeTime  | N/A |
