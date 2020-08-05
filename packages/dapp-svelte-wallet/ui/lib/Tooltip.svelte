<script>
  // Only show tooltip behavior if not disabled
  export let disable = false;
</script>

<style>
  /* Tooltip container */
  .tooltip {
    position: relative;
    display: inline-block;
    border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
  }

  /* Tooltip text */
  .tooltip div {
    visibility: hidden;
    width: 120px;
    background-color: black;
    color: #fff;
    text-align: center;
    padding: 5px 0;
    border-radius: 6px;

    position: absolute;
    z-index: 1;
  }

  /* Show the tooltip text when you mouse over the tooltip container */
  .tooltip:hover div {
    visibility: visible;
  }

  section {
    display: inherit;
  }
</style>

{#if disable}
  <section>
    <slot name="activator" />
  </section>
{:else}
  <section class="tooltip">
    <slot name="activator" />
    <div>
      <slot />
    </div>
  </section>
{/if}

<!-- 
  <Tooltip>
    <div slot="activator">
      <Button>Hover me</Button>
    </div>
    How are you doing?
  </Tooltip> -->
