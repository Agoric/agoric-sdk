<script>
  import Transaction from "./Transaction.svelte";

  export let inbox;
  export let walletP;
</script>

<style>
  main {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
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
          <Transaction {txn} id={txn.id} {walletP} />
        </li>
      {/each}
    </ul>
  {/if}
</main>
