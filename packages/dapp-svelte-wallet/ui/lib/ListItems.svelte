<script>
  export let items;
  export let idFn = item => item.id || item;
  export let horizontal = false;
</script>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0;
  }
  .horizontal {
    display: inline-block;
  }
</style>

<slot />

{#if !Array.isArray(items) || items.length === 0}
  <slot name="empty" />
{:else}
  <ul>
    {#each items as item (idFn(item))}
      <li class={horizontal ? "horizontal" : ""}>
        <slot name="item" {item} />
      </li>
    {/each}
  </ul>
{/if}

<slot name="footer" />
