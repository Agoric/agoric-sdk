<script>
  export let name;
  export let board = undefined;
</script>

{#if Array.isArray(name)}
<span class="confirmedPetname">{name[0]}</span><span class="untrustedName">{
  #each name.slice(1) as path}.{path}{
  /each}</span>
{:else}
<span class="confirmedPetname">{name}</span>
{#if board}(Board Id: {board}){/if}
{/if}

<style>
.confirmedPetname {
  /* color: green; */
}
.untrustedName {
  color: orange;
}
</style>