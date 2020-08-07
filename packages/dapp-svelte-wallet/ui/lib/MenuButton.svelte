<script>
  import Button from 'smelte/src/components/Button';

  export let text = '';
  export let id;
  export let value = undefined;
  export let color = undefined;
  $: highlighted = value === id;
</script>

<style>
  .highlighted {
    background-color: var(--color-secondary-500);
  }
</style>

<div class:highlighted>
  <Button outlined={id === value}
    text fab flat
    on:click={() => (value = id)} {color}
  ><slot>{text}</slot></Button>
</div>
