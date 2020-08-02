<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Amount from "./Amount.svelte";
  import Debug from "../lib/Debug.svelte";
  import { stringify } from "../lib/helpers";
  import Button from 'smelte/src/components/Button';
  import Icon from 'smelte/src/components/Icon';

  export let txn;
  export let id;
  export let walletP;

  // Show the outcome if it is a string, otherwise a default message.
  function showOutcome({ outcome }) {
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
    requestContext: { date, dappOrigin, origin = "unknown origin" } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    status,
  } = txn);
</script>

<style>
  section {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 10px auto;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }

  h2 {
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
  <div>
   <Petname name={instancePetname} board={instanceHandleBoardId} />
    at {formatDateNow(date)} 
    via ({dappOrigin || origin})
	<Debug title="Transaction Detail" target={txn} />
  </div>
  <div>
    {#each Object.entries(give) as [role, { amount, pursePetname }], i}
      <div>
        <h2>Give</h2>
        <Amount {amount} /> from <Petname name={pursePetname} />
      </div>
    {/each}
    {#each Object.entries(want) as [role, { amount, pursePetname }], i}
      <div>
        <h2>Want</h2>
        <Amount {amount} /> into <Petname name={pursePetname} />
      </div>
    {/each}
  </div> 
  <div class="actions">
    <b>{statusText[status || 'proposed']}</b>
    <button on:click={() => E(walletP).acceptOffer(id).then(showOutcome)}>Accept</button>
    <button on:click={() => E(walletP).declineOffer(id)}>Decline</button>
    <button on:click={() => E(walletP).cancelOffer(id)}>Cancel</button>
  </div>
</section>
