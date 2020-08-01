<script>
  import Contact from "./Contact.svelte";
  export let contacts;
</script>

<style>
  section {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    section {
      max-width: none;
    }
  }
</style>

<section>
  <!-- All {JSON.stringify($contacts)} -->
  {#if !Array.isArray($contacts) || $contacts.length === 0}
    No contacts.
  {:else}
    <ul>
      {#each $contacts as contact}
        <li>
          <Contact {contact} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
