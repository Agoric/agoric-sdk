## Zoe and ZCF

At the current time, Zoe is split into two parts: the part that contains common pieces shared across all contracts (called "zoe" for now) and ZCF, the Zoe contract facet that contracts communicate with. The main part is expected to eventually be divided into a an escrow service (which would hold deposited assets) and a coordinator, constituting the main point of contact along with the invite issuer. Each time a contract is instantiated with startInstance(), a new vat is created, and the code for ZCF (the Zoe Contract Facet) is executed, immediately running the code for the contract itself. 

 * [Plan for current split](https://github.com/Agoric/agoric-sdk/issues/553)
 * [PR for split](https://github.com/Agoric/agoric-sdk/pull/1288)
 * ![Zoe-Zcf interaction diagram](./zoe-zcf.png)

### interactions between Zoe and Zcf

Zoe has a single InviteMint, which it uses to mint Invitations which verify the authenticity of contracts and seats. Zoe freely shares the corresponding Issuer, so everyone can recognize valid Invitatations.

Zoe is created by CosmicSwingset. Any user can call `E(zoe).install(bundle)` to create a new installation of a contract. From that point, anyone can use  the installation to get access to the code and to get assurances from Zoe that a particular instance of that contract is running that code.

Anyone with an installationHandle can ask Zoe to create a new instance of a contract with a particular assignment of keywords to Brands, and specified terms. When Zoe receives the `E(zoe).startInstance()` call, it creates a new vat (getting the vat's root object in return) and a private copy of the internal zoeForZcf facet for that contract.

Zoe then calls `E(zcfRoot).startContract(contractParams)` to start the contract. The parameters include the zoe service's public facet, the source bundle, instanceData, zoeForZcf, and Zoe's inviteIssuer.

Zcf evaluates the contract bundle, makes a ZCF facet for the contract's use, and evaluates the contract. The contract returns the initial invitation to Zcf. Zcf bundles up that invitation with an internal facet (zcfForZoe) and returns it to Zoe, which returns `{ invite, instanceRecord }`.


### Making an Invitation and Exercising an Offer

The invite issuer is held by Zoe, which is also responsible for payout liveness. Zcf wants requests to exit the contract to be serialized through its execution queue so its outstanding requests don't lose races. To effectuate this, Zcf wraps an inviteHandler object around the offerHook, and passes this to Zoe to associate with the invitation. 

When an invitation is exercised (`E(zoe).offer(invitation, ...)`), Zoe records the deposit, creates the payout promises, then sets up its data structures, and notifies Zcf. Zcf records what it needs to know about the offer, then returns an object to handle completion requests (if required) to Zoe. Zoe saves the completion object for later use, then invokes the inviteHandler to run the code associated with the new seat, and returns the offerResultRecord to the user.

### Zoe's state

Zoe has a table of installations, which saves the source code for contracts, and provides assurance to clients of contracts that the code that is running is what they expect. Those installations are used to create contract instances, which can be parameterized with terms to customize the contract.

Zoe has a single  table of instances. This is used to track the public and private data associated with each contract instance. The public data is used to construct the instanceRecord, which will be returned when `getInstanceRecord()` is called. Zoe also stores each instances set of offerHandles, so if can call `complete()` if the zcf vat becomes unresponsive. Zoe also has an internal facet to the zcf, which it uses when adding new offers to a contract.

Zoe keeps all deposited funds in unsegregated purses. The amount associated with each offer is recorded in an offerTable, which is kept in sync with parallel tables in each instance of zcf. There is an updater/notifier pair in the Zoe version of those tables, which can be obtained directly from Zoe. Zoe also holds onto payout promises for each offer, which it resolves when completing the offers.

Both Zoe and Zcf keep tables of Issuer, Brands, and AmountMaths for convenience.

### Security Claims


Zoe creates a separate vat for each instance of a contract. Zoe provides an internal facet (zoeForZcf) that Zcf can use, but doesn't make accessible to contracts or anyone else. The zoeForZcf facet has the instanceHandle curried in, so Zoe can tell which contract each is for. Zcf makes an interface (zcfForZoe) accessible to Zoe that Zoe doesn't share with anyone.

Zoe deposits and commingles all the funds that are offered by contracts and their clients. Zcf is informed of the amounts, and can rearrange them using reallocate, but has no accees to the funds, other than funds it deposits directly.

When a contract vat terminates, Zoe will detect that, and will call completeOffer() on all remaining offers.

When an offer is made to Zoe, Zoe will escrow the funds and notify the appropriate zcf. That zcf will create a closeObject if the exit condition calls for it, and pass it back (via Zoe) to the client. If Zcf is still functioning when that closeObject is invoked, the position will be closed out. If Zcf is non-responsive, Zoe will eventually be notified so it can clean up.

Zoe keeps a shared table of issuers. Each Zcf has a cached table containing just the issuers relevant for that contract instance.

Zoe enforces rights conservation and offer safety on every reallocation, so no zcf instance can get access to funds beyond what it properly manages.

Zoe validates requests from Zcfs to verify that they only access their own offers and their own instance data.

Zoe and Zcf maintain parallel copies of the offer table, so they both know the amounts allocated to each offer. Inital offers are created through Zoe and communicated to the relevant Zcf. Requests to change the allocation originate at the Zcf, and are forwarded to Zoe, so it can keep up-to-date in order to handle completion correctly if the Zcf stops communicating. Since requests to the closeObjects go to Zcf first, they will be serialized with other requests from the contract if the contract is still functioning.


