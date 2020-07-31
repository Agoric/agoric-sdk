<script>
  export let name;
</script>

{#if Array.isArray(name)}
<span style="color: orange">{name[0]}</span><span>{
  #each name.slice(1) as path}.{path}{
  /each}</span>
{:else}
{name}
{/if}
