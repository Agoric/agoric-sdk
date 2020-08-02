<script>
  import { E } from "@agoric/eventual-send";

  export let dapp;
  let petname = dapp.petname || dapp.suggestedPetname;
</script>

{#each [dapp] as { actions, enable, petname: origPetname, suggestedPetname, dappOrigin, origin } (dappOrigin || origin)}
  <dt>{dappOrigin || origin} suggested: {JSON.stringify(suggestedPetname)}</dt>
  <dd>
    <input
      type="text"
      on:keydown={e => {
        if (e.key === 'Escape') {
          petname = origPetname;
        } else if (e.key === 'Enter') {
          E(actions).setPetname(petname);
        }
      }}
      bind:value={petname} />
    {#if enable}
      <button on:click={() => E(E(actions).setPetname(petname)).disable()}>
        Disable
      </button>
    {:else}
      <button on:click={() => E(E(actions).setPetname(petname)).enable()}>
        Enable
      </button>
    {/if}
  </dd>
{/each}
