<script>
  import Amount from './Amount.svelte';
  import { purses } from './store';
</script>

<main>
  {#if !Array.isArray($purses) || $purses.length === 0}
    No purses.
  {:else}
    <ul>
    {#each $purses as { pursePetname, currentAmount } (pursePetname)}
    <li>
      <div>{pursePetname}</div>
      <Amount amount={currentAmount} />
    </li>
    {/each}
    </ul>
  {/if}
</main>

<style>
	main {
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
		main {
			max-width: none;
		}
	}
</style>