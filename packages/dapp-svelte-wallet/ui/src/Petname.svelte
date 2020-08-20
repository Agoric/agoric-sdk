<script>
  export let name;
  export let board = undefined;
  export let plural = false;
  export let color = true;
</script>

<style>
  /*
  .confirmedPetname.color {
    color: green;
  }
  */
  .untrustedName.color {
    color: rgb(194, 50, 50);
  }
</style>

{#if Array.isArray(name)}
  <span class:color class="confirmedPetname">{name[0]}</span><span class:color class="untrustedName">
    {#each name.slice(1) as path}.{path}{/each}{#if plural}s{/if}
  </span>
{:else}
  <span class:color class="confirmedPetname">
    {name}{#if plural}s{/if}
  </span>
  {#if board}(Board Id: {board}){/if}
{/if}
