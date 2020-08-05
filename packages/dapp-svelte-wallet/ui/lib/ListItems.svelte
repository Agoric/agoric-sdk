<script>
  export let items;
  export let idFn = item => item.id || item;
</script>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0;
  }
</style>

<slot />

{#if !Array.isArray(items) || items.length === 0}
  <slot name="empty" />
{:else}
  <ul>
    {#each items as item (idFn(item))}
      <li class="list">
        <slot name="item" {item} />
      </li>
    {/each}
  </ul>
{/if}

<slot name="footer" />
