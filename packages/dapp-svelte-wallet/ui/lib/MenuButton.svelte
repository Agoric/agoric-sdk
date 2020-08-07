<script>
  import Button from 'smelte/src/components/Button';

  export let text = '';
  export let id;
  export let value = undefined;
  export let color = undefined;
</script>

<div class={id === value ? "bg-secondary-transLighter" : ""}>
  <Button outlined={id === value} text fab flat on:click={() => (value = id)} {color}>
    {text}
    <slot />
  </Button>
</div>
