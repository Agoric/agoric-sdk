# RUNstake design notes

The RUNstake contract provides loans on the basis of
staked assets that earn rewards.

The following sequence diagram shows an interaction between runStake and:
  - dapp: with rich interaction but low privilege
  - walletBridge: with high privilege and constrained interaction
  - attestation: a service within the runStake contract
  - golang: the Cosmos SDK layer, including the `x/lien` module

Before this interaction, an `ag123` account has been provisioned,
which provides an `AttestationMaker` for that account to the wallet.

Note that the account already has 4000 BLD liened before this interaction.

```mermaid
sequenceDiagram
    actor dapp
    participant walletBridge
    participant attestation
    participant runStake
    participant golang

    note right of dapp: How dapp finds the current state

    note right of walletBridge: walletBridge is provided to dapps and controlled by Wallet UI
    dapp ->>+ walletBridge: getPurseBalance("BLD")
    dapp -->> walletBridge: 5000

    note right of attestation: ag123 is a cosmos address
    dapp ->> attestation: getMax(ag123)
    attestation ->> golang: getAccountState(ag123)
    note right of golang: Cosmos supports lien
    golang -->> attestation: account status in which 4000 BLD liened
    attestation  -->> dapp: account status in which 4000 BLD liened
    note right of dapp: Treasury now knows

    note right of dapp: Want to get 450 RUN by liening 500 BLD
    dapp ->> walletBridge: getReturnableAttestation(want: 450 RUN, give: 500 BLD-Att)
    note right of walletBridge: Blocks on user approval in wallet
    walletBridge ->> attestation: makeAttestation(500 BLD)
    attestation ->> golang: setLienedAmount(4000 + 500 BLD)
    golang -->> attestation: ACK or throws

    attestation -->> walletBridge: Payment of 500 BLD-Att liened on ag123

    walletBridge ->> runStake: offer w/payment for {give: 500 BLD-Att, want: 450 RUN} 

    runStake --> walletBridge: Payment for 450RUN and offerResult
    walletBridge --> dapp: notifiers from offerResult
```

## Components

In addition to the `runStake.js` module with the contract `start` function:

 - `params.js`: utilities for governance parameters
 - `runStakeKit.js`: `makeRunStakeKit` is called once per loan
 - `runStakeManager.js`: handles interest etc. for all loans
 - `attestation.js`: minting tokens that attest to liens,
      and wrapping them in per-user attestation maker authorities.
