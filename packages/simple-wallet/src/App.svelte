<script>
import Purses from './Purses.svelte';
import Transactions from "./Transactions.svelte";
import { purses, inbox } from './store';
</script>

<main>
  <h1>Simple Agoric Wallet</h1>
  <h2>Purses</h2>
  <Purses purses={$purses} />

  <h2>Transactions</h2>
  <Transactions inbox={$inbox} />
</main>
