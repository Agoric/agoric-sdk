<script>
  import { E } from '@agoric/eventual-send';
  import Dapp from './Dapp.svelte';
  export let dapps;
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
  <!-- All dapps {JSON.stringify($dapps)} -->
  {#if !Array.isArray($dapps) || $dapps.length === 0}
    No dapps.
  {:else}
    <dl>
      {#each $dapps as dapp (dapp.origin)}
        <Dapp {dapp} />
      {/each}
    </dl>
  {/if}
</main>
