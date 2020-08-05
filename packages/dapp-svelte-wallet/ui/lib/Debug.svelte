<script>
  import Icon from "svelte-awesome";
  import { code } from "svelte-awesome/icons";

  import Dialog from "smelte/src/components/Dialog";
  import Button from "smelte/src/components/Button";
  import CancelButton from './CancelButton.svelte';
  import { stringify } from './helpers';

  export let title = "Debug Info";
  export let target;
  $: display = stringify(target, 2);

  let showModal = false;
</script>

<style>
  div {
    float: right;
    z-index: 20;
  }
  pre {
    width: calc(100vw - 4em);
    max-width: 48em;
    max-height: 80vh;
    overflow: auto;
  }
</style>
<div>
<Button class="right" icon="code" small text fab flat on:click={() => showModal = true}>
</Button>
</div>
<!-- <pre>{display}</pre> -->
<Dialog bind:value={showModal} class={i => i + "patchModal"}>
  <h2 slot="title">{title}</h2>
  <pre>{display}</pre>
  <div slot="actions">
    <CancelButton isDefault on:click={() => showModal = false} />
  </div>
</Dialog>
