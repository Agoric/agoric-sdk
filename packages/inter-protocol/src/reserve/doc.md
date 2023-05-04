# Reserve 

### addIssuer

```mermaid
sequenceDiagram

participant caller
participant reserveCreatorFacet
participant ammPublicFacet
participant brandForKeyword
participant keywordForBrand
participant zcf


caller ->> reserveCreatorFacet: addIssuer(inIssuer, inKeyword)
reserveCreatorFacet ->> reserveCreatorFacet: get brand from inIssuer
reserveCreatorFacet ->> ammPublicFacet: get liquidity issuer for inIssuer
reserveCreatorFacet ->> reserveCreatorFacet: get liquidity brand from liquidity issuer
reserveCreatorFacet ->> brandForKeyword: store inKeyword => [brand, inKeyword]
reserveCreatorFacet ->> keywordForBrand: store liqudityIssuer => inKeyword
par do
reserveCreatorFacet ->> zcf: Save Issuer: inIssuer, inKeyword
reserveCreatorFacet ->> zcf: Save Issuer: liquidityIssuer,  keyword + "Liquidity"
end
```

### getKeywordForBrand

```mermaid
sequenceDiagram

participant caller
participant reserveContract
participant keywordForBrand


caller ->> reserveContract: getKeywordForBrand(inBrand)
reserveContract ->> keywordForBrand: check for inBrand membership
reserveContract ->> keywordForBrand: get for inBrand object
reserveContract ->> caller: return keyword
 
```


### collateralSeat

```mermaid
sequenceDiagram
participant caller 
participant reserveCreatorFacet
participant collateralSeat

caller ->> reserveCreatorFacet: getAllocations()
reserveCreatorFacet ->> collateralSeat: getCurrentAllocation()
reserveCreatorFacet ->> caller: return current allocations
```


### addCollateralHook + makeAddCollateralInvititation

```mermaid
sequenceDiagram

participant caller
participant reservePublicFacet
participant zoe
participant seat
participant addCollateralHook
participant collateralSeat
participant zcf

caller ->> reservePublicFacet: get invite makeAddCollateralInvititation()
caller ->> zoe: with invite, offer with amountIn
zoe ->> seat: create seat
zoe ->> addCollateralHook: call addCollateralHook
addCollateralHook ->> seat: get proposal

addCollateralHook ->> addCollateralHook: get Keyword for amountIn brand
addCollateralHook ->> zcf: atomicTransfer amountIn from seat to collateralSeat
addCollateralHook ->> seat: seat.exit()
seat ->> zoe: added collateral to the reserve
zoe ->> caller: return status
```

### addLiquidityToAmmPool
```mermaid
sequenceDiagram

participant caller
participant reserveContract
participant collateralSeat
participant stableMint
participant runSeat
participant zcf
participant ammPublicFacet
participant liquidityInvite

caller ->> reserveContract: addLiquidityToAmmPool(collateralAmount, stableAmount)
reserveContract ->> reserveContract: get collateralKeyword from collateralAmount.brand
reserveContract ->> collateralSeat: get current allocation for collateralKeyword
reserveContract ->> reserveContract: ensure  current allocation for collateralKeyword is >= collateralAmount


note right of reserveContract: create the IST
reserveContract ->> stableMint: mintGains of stableAmount, and get runSeat
reserveContract ->> runSeat: increment collateralKeyword: collateralAmount
reserveContract ->> collateralSeat: decrement collateralKeyword: collateralAmount
reserveContract ->> zcf: reallocate(runSeat, collateralSeat)

note right of reserveContract: Add IST and collateral to the AMM
reserveContract ->> ammPublicFacet: get invite for makeAddLiquidityAtRateInvitation
reserveContract ->> reserveContract: create mapping, IST = central, collateralKeyword: secondary
reserveContract ->> reserveContract: get liquidity brand for collateralKeyword
reserveContract ->> reserveContract: terms mapping, give Central: stableAmount, Secondary collateralAmount, want liquidity
reserveContract ->> zcf: offer


note right of reserveContract: transfer from userSeat to LiquidityToken holdings
reserveContract ->> runSeat: get liquidityAmount from seat's getCurrentAllocation
reserveContract ->> runSeat: get liquidityKeyword by collateralKeywod + "Liquidity"

reserveContract ->> runSeat: decrement by liquidityAmount.Liquidity
reserveContract ->> collateralSeat: increment by liquidityKeyword: liquidityAmount.Liquidity
reserveContract ->> zcf: reallocate(runSeat, collateralSeat)

```
