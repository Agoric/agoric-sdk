<script>
  import Icon from "svelte-awesome";
  import { money } from "svelte-awesome/icons";
  import { E } from '@agoric/eventual-send';

  import Modal from "../lib/Modal.svelte";
  import Amount from './Amount.svelte';

  import Button from "smelte/src/components/Button";

  import { contacts, purses } from './store';

  export let source;

  const title = `Transfer from ${source.pursePetname}`;
  let showModal = false;
  let ownPurse = true;
  let valueJSON = "0";
  let toPurse = source;
  let toContact = $contacts && $contacts[0] && $contacts[0][1];

  // FIXME: Make UI for this.
  const send = async destination => {
    try {
      const value = JSON.parse(valueJSON);
      await E(source.actions).send(destination, value);
      showModal = false;
    } catch (e) {
      alert(`Cannot send: ${e}`);
    }
  };
</script>

<style>
  div {
    float: right;
  }
</style>
<div>
<Button class="right" dense color="secondary" on:click={() => (showModal = true)}>
  <Icon data={money} label={title} scale="1" /> Send
</Button>
</div>
{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{title}</h2>
    <slot slot="info">
      <div>Send: <input type="text" bind:value={valueJSON} />
        of <Amount amount={source.currentAmount} /></div>
      <div>
      <ul>
        <li><label for="self"><input id="self" type="radio" bind:group={ownPurse} value={true} />
          to my own purse: <select disabled={!ownPurse} bind:value={toPurse}>
          {#each $purses as p}
            {#if p.brand === source.brand}
              <option value={p}>{p.pursePetname}</option>
            {/if}
          {/each}
        </select>
        <button disabled={!ownPurse} on:click={() => send(toPurse.actions)}>Transfer</button>
        </label>
      </li>
      <li><label for="oneway"><input id="oneway" type="radio" bind:group={ownPurse} value={false} />
        one-way (no Zoe exchange) to: <select disabled={ownPurse} bind:value={toContact}>
          {#each $contacts as [key, contact]}
            <option value={contact}>{key}</option>
          {/each}
        </select>
        <button disabled={ownPurse} on:click={() => send(toContact.actions)}>Irrevocable Send</button>
        </label>
      </li>
      </ul>
      </div>
    </slot>
  </Modal>
{/if}
