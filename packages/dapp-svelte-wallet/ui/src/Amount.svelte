<script>
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import Tooltip from "smelte/src/components/Tooltip";

  export let amount;
  export let displayInfo;

  // The amount gets updated. Make this dynamic
  $: ({ brand, value } = amount);
  const decimate = v => {
    if (Array.isArray(v)) {
      return `${v.length}`;
    }
    const { decimalPlaces = 0, significantDecimals = 0 } = displayInfo || {};

    const bScale = BigInt(10) ** BigInt(decimalPlaces);
    const bValue = BigInt(value);
    const bDecimals = BigInt(bValue % bScale)
    const bUnits = bValue / bScale;

    // Convert 100 to '0000100'.
    const dec0str0 = `${bDecimals}`.padStart(decimalPlaces, '0');
    const dec0str = dec0str0.replace(/0+$/, '');

    const decstr = dec0str.padEnd(significantDecimals, '0');
    const unitstr = `${bUnits}`;
    if (!decstr) {
      // No decimals to display.
      return unitstr;
    }

    return `${unitstr}.${decstr}`;
  };
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
      {decimate(value)}
      <Petname name={brand.petname} />
    </b>
  {/if}

  </div>
