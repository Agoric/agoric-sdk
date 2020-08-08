<script>
  import { E } from '@agoric/eventual-send';

  import Dialog from "smelte/src/components/Dialog";
  import Button from "smelte/src/components/Button";
  import TextField from "smelte/src/components/TextField";
  import Select from "smelte/src/components/Select";

  import CancelButton from '../lib/CancelButton.svelte';
  import DefaultButton from '../lib/DefaultButton.svelte';
  import { walletE } from './store';
  import { q } from '@agoric/assert';

  import { issuers } from './store';
  const title = "Make Purse";
  export let issuerPetname = '';
  let issuer = issuerPetname;
  let petname = '';

  let showModal = false;

  const name = 'Purse';
</script>

<Button on:click={() => (showModal = true)}><slot /></Button>
<Dialog bind:value={showModal}>
  <h5 slot="title">Create New Purse</h5>
  {#if !issuerPetname}
  <Select label="Issuer" items={$issuers} bind:value={issuer} />
  {/if}

  <TextField label="Purse petname" bind:value={petname} hint={`My ${issuer} Purse`} />

  <div slot="actions">
    <DefaultButton on:click={async () => {
      try {
        if (!issuerPetname) {
          throw TypeError(`Need to specify an Issuer`);
        }
        petname = petname.trim();
        if (!petname) {
          throw TypeError(`Need to specify a ${name} petname`);
        }
        await E(walletE).makeEmptyPurse(issuerPetname, petname);
        showModal = false;
      } catch (e) {
        alert(`Cannot create purse: ${e}`);
      }
    }}>Create</DefaultButton>
    <CancelButton on:click={() => showModal = false} />
  </div>

</Dialog>
