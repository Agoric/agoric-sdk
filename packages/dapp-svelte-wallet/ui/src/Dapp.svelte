<script>
  import { E } from "@agoric/eventual-send";
  import TextField from 'smelte/src/components/TextField';
  import Switch from 'smelte/src/components/Switch';

  export let item;
  export let details = true;
  export let summary = true;

  $: ({ enable, actions, suggestedPetname,
    petname: origPetname, dappOrigin, origin } = item);
  let petname = item.petname || item.suggestedPetname;

  const toggleDappEnabled = () => {
    if (enable) {
      E(E(actions).setPetname(petname)).disable();
    } else {
      E(E(actions).setPetname(petname)).enable();
    }
  };

  const keydown = e => {
    // console.log('have', e.key);
    if (e.key === 'Escape') {
      petname = origPetname;
      ev.stopPropagation();
    } else if (e.key === 'Enter') {
      E(actions).setPetname(petname);
      ev.stopPropagation();
    }
  };
</script>

<div>
{#if summary}{dappOrigin || origin}{/if}
{#if details}
  <div on:keydown|capture><TextField
    hint="Alleged name: {JSON.stringify(suggestedPetname)}"
    label="Dapp petname"
    bind:value={petname}
  /></div>
  <div on:click|capture|stopPropagation={toggleDappEnabled}>
    <Switch value={enable} label="Enabled" />
  </div>
{/if}
</div>
