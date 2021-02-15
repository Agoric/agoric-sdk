<script>
  import { E } from "@agoric/captp";
  import { assert, details as X } from '@agoric/assert';

  import Button from 'smelte/src/components/Button';
  import Dialog from 'smelte/src/components/Dialog';
  import TextField from 'smelte/src/components/TextField';

  import DefaultButton from "../lib/DefaultButton.svelte";
  import CancelButton from "../lib/CancelButton.svelte";

  import { boardP } from './store';

  let showModal = false;

  export let name;
  export let hint = `My ${name}`;
  export let adder;
  export let prefix = 'board:';
  let boardId = prefix;
  let petname = '';
</script>

<Button on:click={() => showModal = true}><slot /></Button>
<Dialog bind:value={showModal}>
  <h5 slot="title">Import {name}</h5>
  <TextField label="{name} petname" bind:value={petname} {hint} />
  <TextField label="Board ID" bind:value={boardId} hint="An ID you got from a trusted source" />

  <div slot="actions">
    <DefaultButton on:click={async () => {
      try {
        petname = petname.trim();
        assert(petname, X`Need to specify a ${name} petname`, TypeError);
        boardId = boardId.trim();
        assert(boardId, X`Need to specify a ${name} "board:..."" ID`, TypeError);
        const trimmed = boardId.startsWith(prefix) ? boardId.slice(prefix.length) : boardId;
        const obj = await E(boardP).getValue(trimmed);
        await adder(petname, obj);
        showModal = false;
      } catch (e) {
        alert(`${e}`);
      }
    }}>Import</DefaultButton>
    <CancelButton on:click={() => showModal = false} />
  </div>
</Dialog>
