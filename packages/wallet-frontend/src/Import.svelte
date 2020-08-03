<script>
  import { E } from "@agoric/captp";


  export let name;
  export let adder;
  export let boardP;
  export let prefix = 'board:';
  let boardId = prefix;
  let petname = '';
</script>

<form on:submit|preventDefault>
  <input type="submit" on:click={async () => {
    try {
      petname = petname.trim();
      if (!petname) {
        throw TypeError(`Need to specify a ${name} petname`);
      }
      boardId = boardId.trim();
      if (!boardId) {
        throw TypeError(`Need to specify a ${name} "board:..."" ID`);
      }
      const trimmed = boardId.startsWith(prefix) ? boardId.slice(prefix.length) : boardId;
      const obj = await E(boardP).getValue(trimmed);
      await adder(petname, obj);
    } catch (e) {
      alert(`${e}`);
    }
  }} value="Import" />
  <input type="text" bind:value={petname} placeholder={`${name} Petname`} />
  from ID:<input type="text" bind:value={boardId} />
</form>
