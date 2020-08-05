<script>
  import Button from 'smelte/src/components/Button';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let isDefault = false;

  const handleKeydown = e => {
    if (e.key === 'Escape') {
      dispatch('click');
      return;
    } else if (isDefault && e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      dispatch('click');
      return;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<Button text color="secondary" on:click={ev => { ev.stopPropagation(); dispatch('click'); }}>Cancel</Button>
