<script>
  import { E } from '@agoric/eventual-send';

  export let dapp;
  let petname = dapp.petname;
</script>

{#each [dapp] as { actions, enable, petname: origPetname, suggestedPetname, origin } (origin)}
<dt>{origin} (suggested: {suggestedPetname})</dt>
<dd>
  <input type="text" on:keydown={e => {
    if (e.key === 'Escape') {
      petname = origPetname;
    } else if (e.key === 'Enter') {
      E(actions).setPetname(petname);
    }
   }} bind:value={petname} />
  {#if enable}
  <button on:click={() => E(actions).disable()}>Disable</button>
  {:else}
  <button on:click={() => E(actions).enable()}>Enable</button>
  {/if}
</dd>
{/each}
