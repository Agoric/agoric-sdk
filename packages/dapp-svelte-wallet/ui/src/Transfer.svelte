<script>
  import Icon from "svelte-awesome";
  import { money } from "svelte-awesome/icons";
  import { E } from '@agoric/eventual-send';

  import Amount from './Amount.svelte';

  import Button from "smelte/src/components/Button";
  import Dialog from "smelte/src/components/Dialog";

  import { contacts, purses } from './store';
import DefaultButton from "../lib/DefaultButton.svelte";
import CancelButton from "../lib/CancelButton.svelte";

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
<Button class="right" dense on:click={() => (showModal = true)}>
  <Icon data={money} label={title} scale="1" /> Send
</Button>
</div>
<Dialog bind:value={showModal}>
  <h2 slot="title">{title}</h2>
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
      </label>
    </li>
    <li><label for="oneway"><input id="oneway" type="radio" bind:group={ownPurse} value={false} />
      one-way (no Zoe exchange) to: <select disabled={ownPurse} bind:value={toContact}>
        {#each $contacts as [key, contact]}
          <option value={contact}>{key}</option>
        {/each}
      </select>
      </label>
    </li>
    </ul>
  </div>
  <div slot="actions">
    <DefaultButton on:click={() => send(ownPurse ? toPurse.actions : toContact.actions)}>Send</DefaultButton>
    <CancelButton on:click={() => showModal = false} />
  </div>
</Dialog>
