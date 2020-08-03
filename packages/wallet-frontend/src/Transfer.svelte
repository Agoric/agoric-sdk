<script>
  import Icon from "svelte-awesome";
  import { money } from "svelte-awesome/icons";
  import { E } from '@agoric/eventual-send';

  import Modal from "../lib/Modal.svelte";
  import Debug from '../lib/Debug.svelte';
  import Petname from './Petname.svelte';

  import Button from "smelte/src/components/Button";

  import { contacts, purses } from './store';

  const title = "Transfer";
  export let source;

  let showModal = false;
  let valueJSON = "0";
  let toPurse = source;
  let toContact = $contacts && $contacts[0] && $contacts[0][1];

  // FIXME: Make UI for this.
  const send = destination => {
    const value = JSON.parse(valueJSON);
    return E(source.actions).send(destination, value);
  };
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
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <slot slot="info">
      <div>Send: <input type="text" bind:value={valueJSON} /> <Petname name={source.brandPetname} /></div>
      <div>
      <ul>
        <li>to my own purse: <select bind:value={toPurse}>
          {#each $purses as p}
            {#if p.brand === source.brand}
              <option value={p}>{p.pursePetname}</option>
            {/if}
          {/each}
        </select>
        <button on:click={() => send(toPurse.actions)}>Transfer</button>
      </li>
      <li>
        one-way (no Zoe exchange) to: <select bind:value={toContact}>
          {#each $contacts as [key, contact]}
            <option value={contact}>{key}</option>
          {/each}
        </select>
        <button on:click={() => send(toContact.actions)}>Irrevocable Send</button>
      </li>
      </ul>
      </div>
    </slot>
  </Modal>
{/if}
