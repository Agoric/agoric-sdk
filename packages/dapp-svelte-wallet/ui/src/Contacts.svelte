<script>
  import { E } from '@agoric/eventual-send';

  import ListItems from "../lib/ListItems.svelte";
  import BoardId from "./BoardId.svelte";
  import Import from "./Import.svelte";
  import Contact from "./Contact.svelte";

  import { walletP } from './store';

  export let contacts;
</script>

<style>
  div {
    margin: 1rem;
    /* border: 1px solid grey; */
  }
  .float {
    float: right;
    margin: 0 1rem;
  }
</style>

<section>
  <h2>Contacts
  <div class="float"><Import
    name="Contact"
    adder={(petname, obj) => E(walletP).addContact(petname, obj)}>
    Import
  </Import>
  </div></h2>
  <ListItems items={$contacts}>
    <div slot="item" let:item>
      <Contact contact={item} />
    </div>
    <p slot="empty">No contacts.</p>
  </ListItems>
</section>
