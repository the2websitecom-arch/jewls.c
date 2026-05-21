# Yashas Jewels Website

This is a simple jewelry selling website with Firebase support:

- Owner login for adding items
- Upload from phone gallery, computer files, or camera if the phone offers it
- Item name and price fields
- WhatsApp order links for customers
- Firebase Storage for photos
- Firestore Database for product details
- Local browser storage fallback before Firebase is fully configured

## Open The Website

Because this site now uses JavaScript modules, run a local server from this folder:

```powershell
python -m http.server 4173
```

Then visit:

```text
http://localhost:4173
```

## Owner Login

Local fallback password is in `firebase-config.js`:

```text
owner123
```

To edit it, change:

```js
export const localOwnerPassword = "owner123";
```

For Firebase login:

1. Go to Firebase Authentication.
2. Enable Email/Password provider.
3. Create one owner user.
4. Put that email in `firebase-config.js` as `ownerEmail`.
5. Use that Firebase user's password when logging in.
6. To edit the Firebase password later, change it in Firebase Authentication.

Also replace `owner@example.com` in `firestore.rules` and `storage.rules` with the same owner email before publishing the rules.

## WhatsApp Number

When adding an item, enter the WhatsApp number with country code and no `+`.

Example:

```text
919876543210
```

## Important

Products are stored in:

- Firestore collection: `products`
- Storage folder: `products/`

Customers can read products and images. Only the owner email should be allowed to add or delete products.
