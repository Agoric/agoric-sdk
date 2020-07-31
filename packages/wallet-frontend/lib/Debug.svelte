<script>
  import Icon from "svelte-awesome";
  import { code } from "svelte-awesome/icons";

  import Modal from "./Modal.svelte";

  import { Button } from "svelte-mui";
  import { stringify } from "../../cosmic-swingset/lib/ag-solo/vats/repl";

  export let title = "Debug Info";
  export let target;
  const display = stringify(target, 2);

  let showModal = false;
</script>

<style>
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>

<Button icon raised dense color="sccondary" on:click={() => (showModal = true)}>
  <Icon data={code} label={title} />
</Button>
<!-- <pre>{display}</pre> -->
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <pre>{display}</pre>
    <slot slot="info" />
  </Modal>
{/if}
