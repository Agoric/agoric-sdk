<script>
  import BoardId from "./BoardId.svelte";
  import MakePurse from './MakePurse.svelte';
  import Petname from './Petname.svelte';
import { E } from "@agoric/captp";
import { walletP } from "./store";

  export let issuer;
</script>

<style>

</style>

<section>
  <Petname name={issuer[0]} />
  {#if issuer[1].issuerBoardId}
    (<BoardId id={issuer[1].issuerBoardId} />)
  {:else}
    <button on:click={() => E(walletP).publishIssuer(issuer[1].brand)}>Publish</button>
  {/if}
  <MakePurse issuerPetname={issuer[0]} />
</section>
