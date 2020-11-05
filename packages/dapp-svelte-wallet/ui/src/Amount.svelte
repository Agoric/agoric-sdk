<script>
  import Petname from "./Petname.svelte";
  import Tooltip from "smelte/src/components/Tooltip";
  import { stringifyValue } from './display';

  export let amount;
  export let displayInfo;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
  const stringify = v => stringifyValue(v, displayInfo);
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
          <Petname name={brand.petname} />
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
      {stringify(value)}
      <Petname name={brand.petname} />
    </b>
  {/if}

  </div>
