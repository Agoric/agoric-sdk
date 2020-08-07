<script>
  import { E } from "@agoric/eventual-send";
  import TextField from 'smelte/src/components/TextField';
  import Switch from 'smelte/src/components/Switch';
import { strikethrough } from "svelte-awesome/icons";

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

  const keydown = ev => {
    if (ev.key === 'Escape') {
      petname = origPetname;
      ev.stopPropagation();
    } else if (ev.key === 'Enter') {
      E(actions).setPetname(petname);
      ev.stopPropagation();
    }
  };
</script>

<div>
{#if summary}{origPetname}{/if}
{#if details}
  <div>
    {#if enable}
    User interface: <a target="_blank" href={dappOrigin || origin}>{dappOrigin || origin}</a>
    {:else}
    Alleged user interface: <strikethrough>{dappOrigin || origin}</strikethrough>
    {/if}
  </div>
  <div on:keydown|capture={keydown}><TextField
    hint="Alleged name: {JSON.stringify(suggestedPetname)}"
    label="Dapp petname"
    bind:value={petname}
  /></div>
  <div on:click|capture|stopPropagation={toggleDappEnabled}>
    <Switch value={enable} label="Enabled" />
  </div>
{/if}
</div>
