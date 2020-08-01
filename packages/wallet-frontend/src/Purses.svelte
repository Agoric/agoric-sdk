<script>
  import Purse from "./Purse.svelte";
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
    padding: 10px;
    /* border: 1px solid grey; */
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }

  section {
    /* text-align: center; */
    /* padding: 1em; */
    max-width: 240px;
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    section {
      max-width: none;
    }
  }
</style>

<section>
  <!-- All {JSON.stringify($purses)} -->
  {#if !Array.isArray($purses) || $purses.length === 0}
    No purses.
  {:else}
    <ul>
      {#each $purses as purse}
        <li>
          <Purse {purse} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
