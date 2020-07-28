<script>
  import Transaction from "./Transaction.svelte";

  export let inbox;

  function formatDateNow(stamp) {
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return `${match[1]} ${match[2]}`;
  }

  const pet = petname => petname || "???";

  export let dispatch;
</script>

<style>
  main {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
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
</style>

<main>
  {#if !Array.isArray($inbox) || $inbox.length === 0}
    No transactions.
  {:else}
    <ul>
      {#each $inbox as txn (txn.id)}
        <li>
          <Transaction {txn} id={txn.id} {dispatch} />
        </li>
      {/each}
    </ul>
  {/if}
</main>
