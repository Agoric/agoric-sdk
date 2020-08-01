<script>
  import Icon from "svelte-awesome";
  import { code } from "svelte-awesome/icons";

  import Modal from "./Modal.svelte";

  import { Button } from "svelte-mui";
  import { stringify } from "../../cosmic-swingset/lib/ag-solo/vats/repl";

  export let title = "Debug Info";
  export let target;
  $: display = stringify(target, 2);

  let showModal = false;
</script>

<style>
  div {
    float: right;
  }
</style>
<div>
<Button class="right" dense color="secondary" on:click={() => (showModal = true)}>
  <Icon data={code} label={title} scale="1" />
</Button>
</div>
<!-- <pre>{display}</pre> -->
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <pre>{display}</pre>
    <slot slot="info" />
  </Modal>
{/if}
