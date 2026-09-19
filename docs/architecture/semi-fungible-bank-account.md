# Semi-fungible vbank account purse

## Status

2026-09-18 - Draft

## Context

`packages/vats/src/vat-bank.js` currently exposes a vbank account as a family of
fungible ERTP virtual purses. Each purse is keyed by one registered vbank asset
brand, and the bridge protocol mirrors that shape:

- `VBANK_GET_BALANCE` queries one `(address, denom)` pair.
- `VBANK_GIVE` and `VBANK_GRAB` move one denom at a time.
- `VBANK_BALANCE_UPDATE` publishes a list of `(address, denom, amount)` point
  updates.

This is a good fit for ordinary ERTP fungible issuers, but it does not expose
the Cosmos account itself. A Cosmos bank account owns `sdk.Coins`: a sorted
collection of denoms with integer quantities. The Go vbank keeper already uses
`sdk.Coins` when it batches monitored balance changes, but the JS surface
narrows that information back to single-denom virtual purses.

Some consumers need the entire x/vbank account asset set as one ERTP asset. For
example, a contract may want to escrow, compare, or transfer a multi-denom
portfolio atomically without first converting it into N independent purses and N
bridge calls. In ERTP terms, this is naturally semi-fungible: the denom is the
semi-fungible key and the coin amount is the quantity for that key.

The same model is also intended to make future integration with Coins-like
account systems easier, including future smart-wallet account representations.

## Goal

Enhance `vat-bank.js` so each `Bank` can expose the full Cosmos `Coins` balance
of its address as one semi-fungible ERTP bank purse. Existing per-denom bank
purses should continue to work unchanged.

The new purse represents the account's whole vbank asset set:

```js
AmountMath.make(BankAssetsBrand, makeCopyBag([
  ['ubld', 123n],
  ['uist', 456n],
  ['ibc/...', 789n],
]));
```

The amount value is a `copyBag` whose keys are Cosmos denom strings and whose
multiplicities are the corresponding integer quantities. Denoms with zero
balances are absent from the bag, matching `sdk.Coins` normalization.

## Proposed JS API

Add an account-wide purse method to the `Bank` interface:

```js
const accountPurse = await E(bank).getAccountPurse();
const allCoins = await E(accountPurse).getCurrentAmount();
```

`getAccountPurse()` returns a virtual purse for a durable issuer kit whose asset
kind is `AssetKind.COPY_BAG`. The issuer/brand are shared by the bank manager,
not per account, because all account purses for that manager represent the same
class of rights: fungible Cosmos x/bank assets in multiple denominations.

Publish the issuer and brand as `BankAssets`.

Keep `getPurse(brand)` as the single-denom compatibility path. It continues to
return `AssetKind.NAT` purses for assets registered with `addAsset()`.

The account purse should be exposed explicitly rather than overloading
`getPurse(brand)`. Callers do not need to know a synthetic brand in order to ask
for "this account's whole coin set", and the API avoids ambiguity between
registered fungible vbank brands and the semi-fungible account-assets brand.

## ERTP model

Use an ERTP `copyBag` issuer kit:

- Brand alleged name: `BankAssets`.
- Asset kind: `AssetKind.COPY_BAG`.
- Amount value: `CopyBag<string>`, where each key is a Cosmos denom string.
- Multiplicity: `bigint`, converted to and from Cosmos integer strings.

The bare string key is intentional. It matches Cosmos `Coins` directly and
keeps new Cosmos denoms transparent and permissionless instead of requiring a
vbank asset descriptor before the denom can appear in the account-wide purse.

This preserves ERTP amount algebra:

- `AmountMath.add()` combines quantities for matching denoms.
- `AmountMath.subtract()` withdraws a subset of denoms.
- `AmountMath.isGTE()` checks that an account balance covers all requested
  denoms.

`vat-bank.js` currently uses `virtual-purse.js`, whose guards and JSDoc are
narrowed to `AssetKind.NAT`. Generalize the virtual purse helper to accept an
`AssetKind` and the associated brand, amount, and topic guard patterns. The
virtual purse controller interface should be parameterized the same way. Multiple
asset kinds are one of ERTP's key features, so the shared helper is desirable as
long as the new generic code has clear commentary about the asset-kind-specific
pieces.

The controller shape is the same in spirit:

- `getBalances(brand)` returns a latest topic of account-wide copyBag amounts.
- `pushAmount(amount)` gives a copyBag amount to the Cosmos account.
- `pullAmount(amount)` grabs a copyBag amount from the Cosmos account.

For every virtual purse, the controller is responsible for establishing a
current balance snapshot and then applying point updates that mutate that latest
snapshot. For existing fungible brands, the snapshot is trivially one bigint.
For `BankAssets`, the snapshot is a full `Coins` list represented as a
copyBag.

## Bridge protocol

The current bridge protocol needs full-account operations in addition to
single-denom operations.

New downcalls:

- `VBANK_GET_BALANCE_SNAPSHOT { address, denom? }`
  returns a recent balance snapshot. With `denom`, the snapshot is the single
  denom balance used by existing fungible virtual purses. Without `denom`, the
  snapshot is a normalized JSON list of all nonzero coins for the address.
- `VBANK_GIVE_COINS { recipient, coins }`
  mints/sends all listed coins to the recipient account atomically.
- `VBANK_GRAB_COINS { sender, coins }`
  sends/burns all listed coins from the sender account atomically.

Where `coins` is encoded as a JSON list of `{ denom, amount }` records rather
than an SDK string. The list form avoids parsing ambiguity for IBC denoms and
matches the existing bridge style of explicit string fields.

Snapshot response:

```js
{
  type: 'VBANK_BALANCE_SNAPSHOT',
  nonce,
  address,
  coins: [
    { denom: 'ubld', amount: '123' },
    { denom: 'uist', amount: '456' },
  ],
}
```

This message is a full snapshot for the requested account, not a pushed update.
It replaces the controller's current balance snapshot. An omitted denom in the
snapshot means zero.

A fungible single-denom snapshot uses the same snapshot concept but returns the
requested denom and one integer amount. The account-wide snapshot returns the
`coins` list.

Go should not emit unprovoked `VBANK_BALANCE_SNAPSHOT` messages. After the
snapshot is established, Go continues to push `VBANK_BALANCE_UPDATE` point
updates:

```js
{
  type: 'VBANK_BALANCE_UPDATE',
  nonce,
  updated: [
    { address: 'agoric1...', denom: 'ubld', amount: '123' },
    { address: 'agoric1...', denom: 'uist', amount: '0' },
  ],
}
```

For each affected address, `x/vbank` must include explicit zero entries for
every previously nonzero denom that becomes zero. This lets a controller mutate
the latest snapshot without interpreting omitted denoms as deleted. The system
groups the per-address per-denom point updates into one logical account-purse
point update when an account-wide purse exists for that address.

Both snapshot responses and point updates share one nonce space so JS can use a
single cursor when applying them.

## vat-bank.js structure

Add durable state beside the existing `brandToVPurse` maps:

- one account-assets issuer kit in the bank manager;
- `addressToAccountPurse`, or an `accountPurse` slot inside each
  `addressToBank` entry;
- `addressToAccountUpdater`, keyed only by address, for applying account-wide
  snapshots and point updates.

`prepareBank()` would gain a `getAccountPurse()` method. On first use, it:

1. Creates the semi-fungible virtual purse/controller.
2. Defers balance snapshot work until the purse is observed.

Snapshot establishment should happen lazily for all virtual purses. When
`getCurrentAmount()` calls `const topic = E(this.state.vpc).getBalances(brand);`
and then `E(topic).getUpdateSince()` without arguments, the controller requests
`VBANK_GET_BALANCE_SNAPSHOT` and publishes the resulting current amount. The
same lazy path should support `getCurrentAmountNotifier()` when a caller first
subscribes.

The existing `prepareBankChannelHandler()` should keep dispatching pushed point
updates:

- `VBANK_BALANCE_UPDATE` remains `denom -> address -> BalanceUpdater`.
- `VBANK_BALANCE_UPDATE` also routes affected denoms to any
  `address -> AccountBalanceUpdater`, which mutates its latest account snapshot.

`VBANK_BALANCE_SNAPSHOT` is handled by the controller that requested it. For an
account purse, it maps to `address -> AccountBalanceUpdater` and replaces the
current balance snapshot.

## Consistency with single-denom purses

The account-wide purse and per-denom purses are two ERTP views of the same
Cosmos authority. They can coexist, but they must not silently diverge.

Recommended rule:

- Single-denom operations update the relevant denom purse and any existing
  account-wide purse for the address.
- Account-wide operations update the account-wide purse and any existing
  single-denom purses for touched denoms.
- External Cosmos bank sends update every existing JS view that covers an
  affected address.

This does not require constructing purses that nobody asked for. It only updates
durable publishers that already exist in JS.

The initial account snapshot handles denom discovery. Subsequent point updates
handle normal operation. Point updates must include explicit zero entries for
denoms whose balances drop to zero, so the account-wide controller can delete
those keys from the copyBag snapshot.

## Security and authority

`BankManager.getBankForAddress(address)` is already the authority boundary for
an address. `getAccountPurse()` should live on the returned `Bank`, not on a
public manager method that accepts arbitrary addresses. That keeps the new
operation aligned with the existing POLA model: whoever holds the account's
`Bank` can operate on that account's purses.

The account-assets issuer kit should not be published as a general minting
authority. Callers can hold the issuer and brand, but only the bank vat keeps
the mint or escrow capability needed to redeem and retain payments.

Account-wide operations use the virtual purse `minter` retain/redeem path, not
an ERTP escrow purse. Minting remains a closely held internal capability of the
`BankAssets` issuer kit. The corresponding Go-side authority is the
vbank-controlled Cosmos escrow/accounting path, and Cosmos x/bank rules protect
the Go side from accidental supply changes.

All purses and Cosmos accounts are peers from the ERTP perspective: assets can
move between a Cosmos-backed virtual purse and a fresh JS purse. The
Cosmos-backed virtual purses are the only purses that treat Cosmos as the
authoritative balance source.

## Migration and compatibility

This can be introduced additively:

1. Add Go bridge messages for balance snapshots and multi-coin give/grab.
2. Add `copyBag` virtual purse support in JS.
3. Add `Bank.getAccountPurse()`.
4. Route existing point updates into account-purse controllers when present.
5. Keep `addAsset()` and `getPurse(brand)` unchanged for current smart-wallet,
   provision-pool, and contract callers.

The sim-chain/no-bridge path and tests can use virtual purses backed with custom
test `VirtualPurseController` mocks where necessary.

## Answered questions

These questions came up while reviewing the draft and now have architectural
answers.

- What is the durable identity of the account-assets issuer and brand? The brand
  is per bank manager, shared by all of that manager's account-wide purses.
- What should the account-assets name be? Publish the issuer and brand as
  `BankAssets`.
- What is the account-assets ERTP value shape? Use `CopyBag<string>` with bare
  Cosmos denom strings as keys and bigint multiplicities as balances.
- Which Cosmos denoms appear in the account-wide purse? Every Cosmos denom held
  by the account appears, whether or not it is registered with
  `BankManager.addAsset()`. Adding new Cosmos assets should be transparent and
  permissionless.
- What are the bridge payload forms? Use JSON arrays of `{ denom, amount }`
  records for multi-coin payloads.
- How is an initial balance established? A virtual purse controller lazily
  requests `VBANK_GET_BALANCE_SNAPSHOT` when the purse is observed via
  `getCurrentAmount()` or `getCurrentAmountNotifier()`.
- Are balance snapshots pushed? No. Go should never emit an unprovoked
  `VBANK_BALANCE_SNAPSHOT`; snapshots are requested. Go pushes only
  per-address, per-denom `VBANK_BALANCE_UPDATE` point updates.
- How are account-wide balances kept current after a snapshot? The
  `VirtualPurseController` tracks the latest full snapshot and mutates it with
  grouped point updates. `VBANK_BALANCE_SNAPSHOT` replaces the current snapshot;
  `VBANK_BALANCE_UPDATE` mutates it.
- What must `x/vbank` do when a denom balance becomes zero? It must include an
  explicit zero entry in the point update for every previously nonzero denom
  that became zero.
- Do snapshot responses and point updates share ordering? Yes. They share one
  nonce space so the JS side can apply them with one cursor.
- Are multi-coin operations atomic? Yes. The Go operations must be
  all-or-nothing. On the JS side, ERTP recovery sets prevent partial failures
  from dropping funds.
- How is supply protected? Account-wide operations use the virtual purse
  `minter` retain/redeem path with no ERTP escrow purse. The issuer kit's mint
  is closely held by vbank, while the Go side uses vbank-controlled Cosmos
  authority and x/bank rules.
- Which side is authoritative? All purses and Cosmos accounts are ERTP peers,
  and assets can move between a Cosmos-backed purse and a fresh JS purse. Only
  Cosmos-backed virtual purses treat Cosmos as the authoritative balance source.
- Is the account-wide purse a replacement for per-denom purses? No. It is an
  additional surface designed to integrate more naturally with Coins-like
  account systems and future wallet designs.
- Should `virtual-purse.js` be generalized? Yes. Generalize it for multiple
  asset kinds with clear commentary, since multiple asset types are a central
  ERTP feature.
- Are direct account-wide transfer helpers needed beyond purse `deposit()` and
  `withdraw()`? No.
- How should tests and no-bridge cases model this? Use virtual purses backed by
  custom test `VirtualPurseController` mocks when necessary.

## Remaining question

- What rollout path should preserve upgrade safety for existing durable
  bank-vat state? This needs expert treatment, possibly via interview, because
  the durable upgrade guidelines for this shape of change are not yet
  documented.
