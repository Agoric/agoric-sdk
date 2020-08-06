<script>
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import Tooltip from "../lib/Tooltip.svelte";

  export let amount;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
  const cardinality = v => typeof v === 'number' ? v : v.length;
</script>

<style>
  section, div {
    display: inline;
  }
</style>

<section>
  {#if Array.isArray(value) && value.length !== 0}
    <!-- amount is non-fungible -->
    <Tooltip>
      <div slot="activator">
        <b>
          {value.length}
          <Petname name={brand.petname} plural={value.length !== 1} />
        </b>
      </div>
      {#if brand.petname === 'zoe invite'}
        {#each value as { instanceHandle: { petname }, inviteDesc }}
          instance: {petname}, inviteDesc: {inviteDesc}
        {/each}
      {:else}
        {#each value as elem (elem)}{JSON.stringify(elem)}{/each}
      {/if}
    </Tooltip>
  {:else}
    <b>
      {cardinality(value)}
      <Petname name={brand.petname} plural={cardinality(value) !== 1} />
    </b>
  {/if}

</section>
