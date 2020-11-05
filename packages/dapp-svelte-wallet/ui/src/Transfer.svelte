<script>
  import Icon from "svelte-awesome";
  import { money } from "svelte-awesome/icons";
  import { E } from '@agoric/eventual-send';

  import Amount from './Amount.svelte';

  import Button from "smelte/src/components/Button";
  import Dialog from "smelte/src/components/Dialog";
  import TextField from 'smelte/src/components/TextField';
  import { RadioButton } from "smelte/src/components/RadioButton";
  import Select from 'smelte/src/components/Select';

  import { contacts, purses } from './store';
  import DefaultButton from "../lib/DefaultButton.svelte";
  import CancelButton from "../lib/CancelButton.svelte";
  import { parseValue } from './display';

  export let source;

  const name = `xfer-${Math.random()}`;
  const title = `Transfer from ${source.pursePetname}`;
  let showModal = false;
  let ownPurse = true;
  let valueStr = "0";
  let toPurse = source;
  let toContact = undefined;

  const send = async destination => {
    try {
      const parsed = parseValue(valueStr, source.displayInfo);
      showModal = false;
      await E(source.actions).send(destination.actions, parsed);
    } catch (e) {
      alert(`Cannot send: ${e}`);
    }
  };

  $: contactItems = $contacts.map(({ value, text }) => ({ value, text }));
  $: purseItems = $purses.filter(({ brand }) => brand === source.brand).map(p => ({ value: p, text: p.text }));
</script>

<div>
<Button class="right" dense on:click={() => (showModal = true)}>
  <Icon data={money} label={title} scale="1" /> Send
</Button>
</div>
<Dialog bind:value={showModal}>
  <h2 slot="title">{title}</h2>
  Current balance: <Amount amount={source.currentAmount} displayInfo={source.displayInfo} />
  <TextField bind:value={valueStr} label="Send amount" />

  <table>
    <tr>
      <th></th>
    </tr>
  </table>
  <RadioButton {name} class="fullwidth" bind:selected={ownPurse} value={true}>
    <div slot="label" class="fullwidth">
      <h5>Transfer within wallet</h5>
      <Select
        label="To my own purse"
        disabled={!ownPurse}
        items={purseItems}
        bind:value={toPurse} />
    </div>
  </RadioButton>
  <RadioButton {name} class="fullwidth" bind:selected={ownPurse} value={false}>
    <div slot="label" class="fullwidth">
      <h5>Irrevocable one-way</h5>
      <Select
        label="To contact"
        disabled={ownPurse}
        items={contactItems}
        bind:value={toContact} />
    </div>
  </RadioButton>

  <div slot="actions">
    <DefaultButton on:click={() => send(ownPurse ? toPurse : toContact)}>Send</DefaultButton>
    <CancelButton on:click={() => showModal = false} />
  </div>
</Dialog>
