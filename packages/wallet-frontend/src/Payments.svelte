<script>
  import Amount from "./Amount.svelte";
  import Payment from './Payment.svelte';
  export let payments;
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
  <!-- All {JSON.stringify($payments)} -->
  {#if !Array.isArray($payments) || $payments.length === 0}
    No payments.
  {:else}
    <ul>
      {#each $payments as payment}
        <li>
          <Payment {payment} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
