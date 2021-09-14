<script>
    import ListCard from '../lib/ListCard.svelte';
    import Purse from "./Purse.svelte";
    import Card from 'smelte/src/components/Card';
  
    import { purses } from './store';
  </script>
  
  <h1>Purses</h1>
  <ListCard items={$purses} storeKey="purses">  
    <div slot="empty">
      No purses.
    </div>
  
    <div slot="item-header" let:item>
      <Purse {item} details={false} summaryLine={1} />
    </div>
  
    <div slot="item-header-rest" let:item>
      <Purse {item} details={false} summaryLine={2} />
    </div>
  
    <div slot="item-details" let:item>
      <Purse {item} summary={false}/>
    </div>
  </ListCard>