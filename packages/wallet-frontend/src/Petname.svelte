<script>
  export let name;
  export let board = undefined;
  export let plural = false;
</script>

<style>
  .confirmedPetname {
    /* color: green; */
  }
  .untrustedName {
    color: rgb(194, 50, 50);
  }
</style>

{#if Array.isArray(name)}
  <span class="confirmedPetname">{name[0]}</span><span class="untrustedName">
    {#each name.slice(1) as path}.{path}{#if plural}s{/if}{/each}
  </span>
{:else}
  <span class="confirmedPetname">
    {name}{#if plural}s{/if}
  </span>
  {#if board}(Board Id: {board}){/if}
{/if}
