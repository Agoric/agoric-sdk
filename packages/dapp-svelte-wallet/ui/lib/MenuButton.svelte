<script>
  import Button from './Button.svelte';
  // import Button from 'smelte/src/components/Button';

  export let text = '';
  export let id;
  export let value = undefined;
  export let color = undefined;
  $: highlighted = value === id;
</script>

<Button outlined={id === value}
  text fab flat
  on:click={() => (value = id)} color={value === id ? 'secondary' : color}
><slot>{text}</slot></Button>
