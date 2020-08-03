<script>
  import { E } from '@agoric/eventual-send';

  import Modal from "../lib/Modal.svelte";

  import Button from "smelte/src/components/Button";

  import { walletP } from './store';

  const title = "Make Purse";
  export let issuerPetname;
  let petname;

  let showModal = false;

  const name = 'Purse';
</script>

<style>
  div {
    float: right;
  }
</style>
<div>
<button on:click={() => (showModal = true)}>Make Purse</button>
</div>
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <slot slot="info">
      <form>
      <input type="submit" on:click={async () => {
        try {
          petname = petname.trim();
          if (!petname) {
            throw TypeError(`Need to specify a ${name} petname`);
          }
          await E(walletP).makeEmptyPurse(issuerPetname, petname);
          showModal = false;
        } catch (e) {
          alert(`Cannot create purse: ${e}`);
        }
      }} value="Create" />
      <input type="text" bind:value={petname} placeholder={`New ${issuerPetname} Purse`} />
      </form>
    </slot>
  </Modal>
{/if}
