<script>
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import Tooltip from "smelte/src/components/Tooltip";

  export let amount;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
  const cardinality = v => typeof v === 'number' ? v : v.length;
</script>

<style>
  .dotted-underline {
    border-bottom: 1px dotted black;
  }
</style>

<div>
  {#if Array.isArray(value) && value.length !== 0}
    <!-- amount is non-fungible -->
    <Tooltip>
      <div slot="activator">
        <b class="dotted-underline">
          {value.length}
          <Petname name={brand.petname} plural={value.length !== 1} />
        </b>
      </div>
      {#if brand.petname === 'zoe invite'}
        {#each value as { instance: { petname }, description }}
          <div>instance: <Petname color={false} name={petname} /></div>
          <div>description: {description}</div>
        {/each}
      {:else}
        {value.map(v => JSON.stringify(v)).join(', ')}
      {/if}
    </Tooltip>
  {:else}
    <b>
      {cardinality(value)}
      <Petname name={brand.petname} plural={cardinality(value) !== 1} />
    </b>
  {/if}

  </div>
