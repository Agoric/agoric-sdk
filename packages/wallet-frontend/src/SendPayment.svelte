<script>
  import Icon from "svelte-awesome";
  import { money } from "svelte-awesome/icons";
  import { E } from '@agoric/eventual-send';

  import Modal from "../lib/Modal.svelte";

  import Button from "smelte/src/components/Button";

  import { contacts, purses } from './store';

  const title = "Send Payment";
  export let purse;

  let showModal = false;


  // FIXME: Make UI for this.
  const value = 3;
  $: destination = $contacts && $contacts[0];
  $: send = () => E(purse.actions).send(destination.actions, value);
</script>

<style>
  div {
    float: right;
  }
</style>
<div>
<Button class="right" dense color="secondary" on:click={() => (showModal = true)}>
  <Icon data={money} label={title} scale="1" /> Transfer
</Button>
</div>
<!-- <pre>{display}</pre> -->
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <button on:click={send}>Send Payment</button>
    <slot slot="info" />
  </Modal>
{/if}
