<script>
  import { E } from "@agoric/eventual-send";
  import Dapp from "./Dapp.svelte";
  export let dapps;
</script>

<style>
  section {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  ul {
    list-style: none;
  }

  li {
    padding: 10px;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }

  @media (min-width: 640px) {
    section {
      max-width: none;
    }
  }
</style>

<section>
  <!-- All dapps {JSON.stringify($dapps)} -->
  {#if !Array.isArray($dapps) || $dapps.length === 0}
    No dapps.
  {:else}
    <ul>
      {#each $dapps as dapp (dapp.origin)}
        <li>
          <Dapp {dapp} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
