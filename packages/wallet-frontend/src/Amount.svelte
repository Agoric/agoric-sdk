<script>
  import Petname from './Petname.svelte';
  export let amount;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
</script>

<main>
  {#if Array.isArray(value)}
    {#if value.length === 0}
      <b><Petname name={brand.petname} /> purse is empty.</b>
    {:else if brand.petname === 'zoe invite'}
      <b><Petname name={brand.petname} /> (Non-fungible)</b>
      <!-- <pre>{JSON.stringify(value, null, 2)}</pre> -->
      {#each value as { instanceHandle: { petname }, inviteDesc }}
        instance: {petname}, inviteDesc: {inviteDesc}
      {/each}
    {:else}
      <b><Petname name={brand.petname}/> (Non-fungible)</b>
      {#each value as elem (elem)}{JSON.stringify(elem)}{/each}
    {/if}
  {:else}
    <b>{value} <Petname name={brand.petname} /></b>
  {/if}
</main>
