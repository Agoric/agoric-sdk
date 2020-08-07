<script>
  import Button from 'smelte/src/components/Button';
  import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

  const handleKeydown = e => {
    if (e.key === 'Enter') {
      dispatch('click');
      return;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<Button text on:click={ev => { ev.stopPropagation(); dispatch('click'); }}><slot/></Button>
