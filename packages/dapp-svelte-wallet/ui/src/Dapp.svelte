<script>
  import { E } from "@agoric/eventual-send";
  import Card from 'smelte/src/components/Card';

  export let dapp;
  let petname = dapp.petname || dapp.suggestedPetname;

  const onKeydown = e => {
        if (e.key === 'Escape') {
          petname = origPetname;
        } else if (e.key === 'Enter') {
          E(actions).setPetname(petname);
        }
      };
</script>

<style>
  div {
    padding: 10px;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }
</style>

<div>
{#each [dapp] as { actions, enable, petname: origPetname, suggestedPetname, dappOrigin, origin } (dappOrigin || origin)}
  <p>{dappOrigin || origin} suggested: {JSON.stringify(suggestedPetname)}</p>
  <dd>
    <input
      type="text"
      on:keydown={onKeydown}
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
</div>