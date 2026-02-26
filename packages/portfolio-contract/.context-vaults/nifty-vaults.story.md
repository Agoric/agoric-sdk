# NiftyVaults \- a story

Story

* Chris wants to build a vault that others can invest in made of up 4 different instruments available within Ymax  
* Chris wants to ensure that on an hourly basis the vault moves all invested funds to the instruments with the highest APY over the past 24 hours  
* Chris can choose to configure receiving a portion of yield generated as a fee  
* End-users need to be able to come in and deposit USDC into the vault and get LP tokens out  
* End-users need to be able to redeem LP tokens to get their USDC back (including any yield) 

Requirements:

* Imagine only 1 deposit asset (USDC)  
* Imagine only instruments that are already available through Ymax  
* Imagine only networks that are already available through Ymax

Clarified assumptions for this spike:

* The story models one vault; product direction can support one vault per creator/strategy.
* Rebalancing is best-effort hourly.
* LP token/share behavior for this spike follows ERC-4626.
* Chris picks instruments from the existing Ymax instrument table; for this spike, Chris's instrument choices can be fixed.
* The creator fee is a cut of yield (performance fee).
* End-user UI is in scope; creator UI is a stretch goal.

Look at:

* [ERC-4626](https://ethereum.org/developers/docs/standards/tokens/erc-4626)  
* Veda BoringVault  
* Can consider looking at [Somm](https://app.somm.finance/)

Some questions

* Currently we use an off-chain service to get APYs  
  * Could we integrate with on-chain oracles like Chainlink?

Background

* [Veda Blog — What Is DeFi Yield? A Beginner’s Guide](https://veda.tech/blog/what-is-defi-yield-how-does-it-work-beginners-guide) February 11, 2026

Project Management stuff:

* [Spike: Vaults › Overview](https://linear.app/agoric/project/spike-vaults-7ffbdd922a3e/overview)
