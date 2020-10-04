<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Amount from "./Amount.svelte";
  import Debug from "../lib/Debug.svelte";
  
  import { walletP } from './store';
  import Chip from "../lib/Chip.svelte";

  export let item;
  export let summary = true;
  export let summaryLine = 0;
  export let details = true;

  // Show the outcome if it is a string, otherwise a default message.
  function showOutcome(obj) {
    if (!obj) {
      return;
    }
    let { dappContext, outcome } = obj;
    if (dappContext) {
      // They have opted-in to handling the outcome.
      return;
    }
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

  const statusColors = {
    accept: "success",
    rejected: "error",
    decline: "error",
    pending: "alert",
    proposed: "grey",
  };

  $: ({
    instancePetname,
    instanceHandleBoardId,
    installationHandleBoardId,
    offerId,
    requestContext: { date, dappOrigin, origin = "unknown origin" } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
  } = item);

  $: status = item.status || 'proposed';
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

  .actions {
    margin-top: 1em;
  }
</style>

<section>
  {#if summary}
    {#if !summaryLine || summaryLine === 1}
      {formatDateNow(date)} <Chip outline selected
      color={statusColors[status]}
    >{statusText[status]}</Chip>
    {/if}
    {#if !summaryLine || summaryLine === 2}
      <Petname name={instancePetname} board={instanceHandleBoardId} /> via ({dappOrigin || origin})
    {/if}
  {/if}
  {#if details}
  <div>
	<Debug title="Offer Detail" target={item} />
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
    {#if status === 'pending'}
    <Chip on:click={() => E(walletP).cancelOffer(offerId)}
      selected icon="clear" color="alert"
    >Cancel</Chip>
    {/if}
    {#if status === 'proposed'}
    <div class="flex flex-row">
    <Chip on:click={() => E(walletP).acceptOffer(offerId).then(showOutcome)}
      selected icon="check" color="success"
    >Accept</Chip> <Chip on:click={() => E(walletP).declineOffer(offerId)}
      selected icon="clear" color="error"
    >Decline</Chip>
    </div>
    {/if}
  </div>
  {/if}
</section>
