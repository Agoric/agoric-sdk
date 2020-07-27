<script>
  export let inbox;

  function formatDateNow(stamp) {
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return `${match[1]} ${match[2]}`;
  }

  const pet = petname => petname || '???';
</script>

<main>
  {#if !Array.isArray(inbox) || inbox.length === 0}
    No transactions.
  {:else}
    <ul>
    {#each inbox as {
      requestContext: { date, origin = 'unknown origin' } = {},
      id,
      instancePetname,
      proposalForDisplay: { give = {}, want = {} } = {},
      status,
    }}
    <li>
      <div>At&nbsp;
        {#if date}
        {formatDateNow(date)}
        {:else}
        <i>unknown time</i>
        {/if} via&nbsp;{origin}</div>
      <div>
        {pet(instancePetname)}&nbsp;
      </div>
      <div>
        {#each Object.entries(give) 
          as [role, { amount: { brand: { petname: brandPetname }, value, pursePetname, }}], i}
          <div>
            {#if i === 0}
            Give
            {:else}
            and&nbsp;give
            {/if}&nbsp;
            <div>{JSON.stringify(value)}&nbsp;
              {pet(brandPetname)}
            </div>
            &nbsp;from&nbsp;
            <div>
              {pet(pursePetname)}
            </div>
          </div>
        {/each}
        {#each Object.entries(want) 
          as [role, { amount: { brand: { petname: brandPetname }, value, pursePetname, }}], i}
          <div>
            {#if i === 0}
              {#if Object.keys(give).length > 0}
                to&nbsp;receive
              {:else}
                Receive
              {/if}
            {:else}
            and&nbsp;receive
            {/if}&nbsp;
            <div>{JSON.stringify(value)}&nbsp;
              {pet(brandPetname)}
            </div>
            &nbsp;into&nbsp;
            <div>
              {pet(pursePetname)}
            </div>
          </div>
        {/each}
      </div>
      <div>decline|rejected|accept|pending|cancel</div>
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