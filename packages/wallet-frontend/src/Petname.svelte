<script>
  export let name;
</script>

{#if Array.isArray(name)}
<span class="confirmedPetname">{name[0]}</span><span class="untrustedName">{
  #each name.slice(1) as path}.{path}{
  /each}</span>
{:else}
<span class="confirmedPetname">{name}</span>
{/if}

<style>
.confirmedPetname {
  /* color: green; */
}
.untrustedName {
  color: orange;
}
</style>