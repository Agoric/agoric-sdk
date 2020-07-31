<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { stringify } from "../lib/helpers";
  import { Button, Icon } from "svelte-mui";

  export let txn;
  export let id;
  export let walletP;

  function formatDateNow(stamp) {
    if (!stamp) {
      return "unknown time";
    }
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return `${match[1]} ${match[2]}`;
  }

  const statusText = {
    decline: "Declined",
    rejected: "Rejected",
    accept: "Accepted",
    pending: "Pending",
    proposed: "Proposed",
  };

  $: ({
    instancePetname,
    instanceHandleBoardId,
    installationHandleBoardId,
    requestContext: { date, origin = "unknown origin" } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    status,
  } = txn);
</script>

<style>
  main {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 10px auto;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }

  button:hover {
    background-color: red;
  }
</style>

<main>
  <div>
   <Petname name={instancePetname} board={instanceHandleBoardId} />
    at {formatDateNow(date)} 
    via ({origin})
  </div>
  <div>
    {#each Object.entries(give) as [role, { amount: { brand, value }, pursePetname }], i}
      <div>
        <h2>Give</h2>
        <div>
          {JSON.stringify(value)}&nbsp;<Petname name={brand.petname} /> 
          from <Petname name={pursePetname} />
        </div>
      </div>
    {/each}
    {#each Object.entries(want) as [role, { amount: { brand, value }, pursePetname }], i}
      <div>
        <h2>Want</h2>
        <div>
          {JSON.stringify(value)}&nbsp;<Petname name={brand.petname} />
        </div>
        &nbsp;into&nbsp;<Petname name={pursePetname} />
      </div>
    {/each}
  </div> 
  <div>
    <b>{statusText[status || 'proposed']}</b>
    <button on:click={() => E(walletP).acceptOffer(id)}>Accept</button>
    <button on:click={() => E(walletP).declineOffer(id)}>Decline</button>
    <button on:click={() => E(walletP).cancelOffer(id)}>Cancel</button>
  </div>

	<Debug title="Transaction Detail" target={txn} />
</main>
