<script>
  export let amount;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
</script>

<main>
  {#if Array.isArray(value)}
    {#if value.length === 0}
      <b>{JSON.stringify(brand.petname)} purse is empty.</b>
    {:else if brand.petname === 'zoe invite'}
      <b>{brand.petname} (Non-fungible)</b>
      {#each value as { instanceHandle: { petname }, inviteDesc } (petname)}
        instance: {petname}, inviteDesc: {inviteDesc}
      {/each}
    {:else}
      <b>{brand.petname} (Non-fungible)</b>
      {#each value as elem (elem)}{JSON.stringify(elem)}{/each}
    {/if}
  {:else}
    <b>{value} {brand.petname}</b>
  {/if}
</main>
