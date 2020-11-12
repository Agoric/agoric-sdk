<script>
  import { E } from '@agoric/eventual-send';
  import Card from 'smelte/src/components/Card';
  import ListCard from '../lib/ListCard.svelte';

  import Import from "./Import.svelte";
  import Contact from "./Contact.svelte";

  import { contacts, walletP } from './store';
</script>

<ListCard storeKey="contacts" items={$contacts}>
  <div slot="title">
    <Card.Title
      title="Contacts"
    />
  </div>

  <div slot="empty">
    No contacts.
  </div>

  <div slot="item-header" let:item>
    <Contact {item} details={false} />
  </div>

  <div slot="item-details" let:item>
    <Contact {item} summary={false} />
  </div>

  <div slot="actions">
    <Import name="Contact"
    adder={(petname, obj) => E(walletP).addContact(petname, obj)}>
    Import
    </Import>
  </div>
</ListCard>
