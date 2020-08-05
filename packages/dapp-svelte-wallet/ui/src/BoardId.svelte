<script>
  import Button from 'smelte/src/components/Button';

  export let id;
  export let onPublish = undefined;
</script>

{#if id}
  (<b>board:{id}</b>)
{:else if onPublish}
  <Button on:click={onPublish}>Publish</Button>
{/if}
