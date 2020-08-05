<script>
  import { slide } from 'svelte/transition';

  import List from 'smelte/src/components/List';

  import Icon from "smelte/src/components/Icon";
  import Card from "smelte/src/components/Card";
  import ListItem from 'smelte/src/components/List/ListItem.svelte';

  export let items = [];

  export let expandIcon = 'arrow_right';

  let expanded = [];

  const toggle = item => {
    if (expanded.includes(item)) {
      expanded = expanded.filter(it => item !== it);
    } else {
      expanded = [...expanded, item];
    }
  };
</script>

<Card.Card class="fullwidth px-2 py-2">
  <slot name="title"></slot>

  <!-- All {JSON.stringify($issuers)} -->
  {#if !Array.isArray(items) || items.length === 0}
    <slot name="none">No items.</slot>
  {:else}
    <List {items}>
      <div slot="item" class="px-1" let:item>
        <div class="fullwidth px-1">
          <ListItem dense selectedClasses="bg-primary-trans" {item} {...item} on:click={() => toggle(item)}>
            <div class="flex items-center">
              <Icon tip={expanded.includes(item)}>{expandIcon}</Icon>
              <slot name="item-header" {item}><span>{item.text}</span></slot>
            </div>
          </ListItem>

          {#if expanded.includes(item)}
            <div in:slide class="ml-10">
              <slot name="item-details" {item}></slot>
            </div>
          {/if}
        </div>
      </div>
    </List>
  {/if}

  <slot name="actions"></slot>
</Card.Card>
