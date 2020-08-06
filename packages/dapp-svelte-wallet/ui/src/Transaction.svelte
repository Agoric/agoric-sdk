<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Amount from "./Amount.svelte";
  import Debug from "../lib/Debug.svelte";

  import { walletP } from './store';

  export let item;
  export let summary = true;
  export let details = true;

  // Show the outcome if it is a string, otherwise a default message.
  function showOutcome(obj) {
    if (!obj) {
      return;
    }
    const { outcome } = obj;
    if (typeof outcome !== 'string') {
      outcome = 'Offer was accepted.';
    }
    alert(outcome);
  }

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
    offerId,
    requestContext: { date, dappOrigin, origin = "unknown origin" } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    status,
  } = item);
</script>

<style>
  section {
    /* text-align: center; */
    max-width: 240px;
  }

  h6 {
    /* color: #ff3e00; */
    text-transform: uppercase;
    font-size: 1em;
    font-weight: bold;
    margin-top: 1em;
  }

  @media (min-width: 640px) {
    section {
      max-width: none;
    }
  }

  button:hover {
    background-color: red;
  }

  .actions {
    margin-top: 1em;
  }
</style>

<section>
  {#if summary}
    {formatDateNow(date)} <Petname name={instancePetname} board={instanceHandleBoardId} />
  {/if}
  {#if details}
  <div>
    via ({dappOrigin || origin})
	<Debug title="Transaction Detail" target={item} />
  </div>
  <div>
    {#each Object.entries(give) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Give</h6>
        <Amount {amount} /> from <Petname name={pursePetname} />
      </div>
    {/each}
    {#each Object.entries(want) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Want</h6>
        <Amount {amount} /> into <Petname name={pursePetname} />
      </div>
    {/each}
  </div> 
  <div class="actions">
    <b>{statusText[status || 'proposed']}</b>
    <button on:click={() => E(walletP).acceptOffer(offerId).then(showOutcome)}>Accept</button>
    <button on:click={() => E(walletP).declineOffer(offerId)}>Decline</button>
    <button on:click={() => E(walletP).cancelOffer(offerId)}>Cancel</button>
  </div>
  {/if}
</section>
