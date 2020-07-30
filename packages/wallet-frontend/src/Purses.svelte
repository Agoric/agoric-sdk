<script>
  import Amount from "./Amount.svelte";
  // a store of purses
  export let purses;
</script>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0;
  }
  li {
    margin: 1rem;
    border: 1px solid grey;
  }

  main {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: var(--text-color-normal);
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
  <!-- All {JSON.stringify($purses)} -->
  {#if !Array.isArray($purses) || $purses.length === 0}
    No purses.
  {:else}
    <ul>
      {#each $purses as { pursePetname, currentAmount } (pursePetname)}
        <li>
          <div>{pursePetname}</div>
          <Amount amount={currentAmount} />
        </li>
      {/each}
    </ul>
  {/if}
</main>
