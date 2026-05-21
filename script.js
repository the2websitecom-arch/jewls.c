import { firebaseConfig, firebaseEnabled, localOwnerPassword, ownerEmail } from "./firebase-config.js";

const STORAGE_KEY = "yashas-jewels-items";
const PHONE_KEY = "yashas-jewels-phone";
const FIREBASE_VERSION = "10.12.5";

const ownerToggle = document.querySelector("#ownerToggle");
const ownerPanel = document.querySelector("#ownerPanel");
const loginForm = document.querySelector("#loginForm");
const itemForm = document.querySelector("#itemForm");
const logoutButton = document.querySelector("#logoutButton");
const passwordInput = document.querySelector("#passwordInput");
const photoInput = document.querySelector("#photoInput");
const previewImage = document.querySelector("#previewImage");
const nameInput = document.querySelector("#nameInput");
const priceInput = document.querySelector("#priceInput");
const phoneInput = document.querySelector("#phoneInput");
const productGrid = document.querySelector("#productGrid");
const productTemplate = document.querySelector("#productTemplate");
const itemCount = document.querySelector("#itemCount");
const saveButton = document.querySelector("#saveButton");
const statusMessage = document.querySelector("#statusMessage");

let selectedFile = null;
let selectedPhoto = "";
let ownerLoggedIn = false;
let items = [];
let firebaseApi = null;
let firebaseReady = false;

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const starterItems = [
  {
    id: makeId(),
    name: "Temple Gold Necklace",
    price: 12499,
    phone: "919876543210",
    image:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Crect width='640' height='640' fill='%23fff4e8'/%3E%3Ccircle cx='320' cy='252' r='148' fill='none' stroke='%23bf8a28' stroke-width='34'/%3E%3Ccircle cx='320' cy='408' r='62' fill='%239d2f45'/%3E%3Ccircle cx='236' cy='368' r='34' fill='%23c79a42'/%3E%3Ccircle cx='404' cy='368' r='34' fill='%23c79a42'/%3E%3Cpath d='M210 462h220' stroke='%23731f31' stroke-width='28' stroke-linecap='round'/%3E%3C/svg%3E"
  },
  {
    id: makeId(),
    name: "Ruby Ring",
    price: 3499,
    phone: "919876543210",
    image:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Crect width='640' height='640' fill='%23f5fff8'/%3E%3Ccircle cx='320' cy='376' r='142' fill='none' stroke='%23c79a42' stroke-width='42'/%3E%3Cpath d='M320 116l116 92-44 140H248l-44-140z' fill='%239d2f45'/%3E%3Cpath d='M251 210h138M278 116l-30 232M362 116l30 232' stroke='%23fff' stroke-width='12' opacity='.42'/%3E%3C/svg%3E"
  }
];

function setStatus(message) {
  statusMessage.textContent = message;
}

function readLocalItems() {
  const savedItems = localStorage.getItem(STORAGE_KEY);

  if (!savedItems) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterItems));
    localStorage.setItem(PHONE_KEY, starterItems[0].phone);
    return starterItems;
  }

  try {
    return JSON.parse(savedItems);
  } catch {
    return [];
  }
}

function saveLocalItems(nextItems) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function buildWhatsAppUrl(item) {
  const message = `Hello, I want to order ${item.name} for ${formatPrice(item.price)}.`;
  return `https://wa.me/${item.phone}?text=${encodeURIComponent(message)}`;
}

async function setupFirebase() {
  if (!firebaseEnabled) {
    return;
  }

  const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
  const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
  const firestoreModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
  const storageModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-storage.js`);

  const app = appModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  const db = firestoreModule.getFirestore(app);
  const storage = storageModule.getStorage(app);

  firebaseApi = {
    auth,
    db,
    storage,
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
    signOut: authModule.signOut,
    collection: firestoreModule.collection,
    addDoc: firestoreModule.addDoc,
    deleteDoc: firestoreModule.deleteDoc,
    doc: firestoreModule.doc,
    onSnapshot: firestoreModule.onSnapshot,
    orderBy: firestoreModule.orderBy,
    query: firestoreModule.query,
    serverTimestamp: firestoreModule.serverTimestamp,
    ref: storageModule.ref,
    uploadBytes: storageModule.uploadBytes,
    getDownloadURL: storageModule.getDownloadURL,
    deleteObject: storageModule.deleteObject
  };

  firebaseReady = true;
  listenForFirebaseItems();
}

function listenForFirebaseItems() {
  const productsQuery = firebaseApi.query(
    firebaseApi.collection(firebaseApi.db, "products"),
    firebaseApi.orderBy("createdAt", "desc")
  );

  firebaseApi.onSnapshot(
    productsQuery,
    (snapshot) => {
      items = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));
      renderProducts();
    },
    () => {
      setStatus("Firebase could not load products. Check Firestore rules and project setup.");
    }
  );
}

function renderProducts() {
  productGrid.innerHTML = "";
  itemCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  if (items.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No jewels added yet. Owner can login and add the first item.";
    productGrid.append(emptyState);
    return;
  }

  items.forEach((item) => {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".product-image");
    const title = card.querySelector("h3");
    const price = card.querySelector(".price");
    const link = card.querySelector(".whatsapp-link");
    const deleteButton = card.querySelector(".delete-button");

    image.src = item.image;
    image.alt = item.name;
    title.textContent = item.name;
    price.textContent = formatPrice(item.price);
    link.href = buildWhatsAppUrl(item);

    if (ownerLoggedIn) {
      deleteButton.classList.remove("is-hidden");
      deleteButton.addEventListener("click", () => deleteItem(item));
    }

    productGrid.append(card);
  });
}

async function deleteItem(item) {
  if (firebaseReady) {
    await firebaseApi.deleteDoc(firebaseApi.doc(firebaseApi.db, "products", item.id));

    if (item.imagePath) {
      try {
        await firebaseApi.deleteObject(firebaseApi.ref(firebaseApi.storage, item.imagePath));
      } catch {
        setStatus("Item deleted. Old image could not be removed from Storage.");
      }
    }

    return;
  }

  items = items.filter((currentItem) => currentItem.id !== item.id);
  saveLocalItems(items);
  renderProducts();
}

function setOwnerState(isLoggedIn) {
  ownerLoggedIn = isLoggedIn;
  loginForm.classList.toggle("is-hidden", isLoggedIn);
  itemForm.classList.toggle("is-hidden", !isLoggedIn);
  logoutButton.classList.toggle("is-hidden", !isLoggedIn);
  ownerToggle.textContent = isLoggedIn ? "Owner Panel" : "Owner Login";
  renderProducts();
}

function resetItemForm() {
  selectedFile = null;
  selectedPhoto = "";
  itemForm.reset();
  phoneInput.value = localStorage.getItem(PHONE_KEY) || "919876543210";
  previewImage.removeAttribute("src");
  previewImage.classList.add("is-hidden");
}

async function createFirebaseItem(newItem) {
  const imagePath = `products/${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`;
  const imageRef = firebaseApi.ref(firebaseApi.storage, imagePath);
  await firebaseApi.uploadBytes(imageRef, selectedFile);
  const imageUrl = await firebaseApi.getDownloadURL(imageRef);

  await firebaseApi.addDoc(firebaseApi.collection(firebaseApi.db, "products"), {
    name: newItem.name,
    price: newItem.price,
    phone: newItem.phone,
    image: imageUrl,
    imagePath,
    createdAt: firebaseApi.serverTimestamp()
  });
}

ownerToggle.addEventListener("click", () => {
  ownerPanel.classList.toggle("is-hidden");
  ownerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  try {
    if (firebaseReady) {
      if (ownerEmail === "owner@example.com") {
        throw new Error("Set ownerEmail in firebase-config.js first.");
      }

      await firebaseApi.signInWithEmailAndPassword(firebaseApi.auth, ownerEmail, passwordInput.value.trim());
    } else if (passwordInput.value.trim() !== localOwnerPassword) {
      throw new Error("Wrong password");
    }

    passwordInput.setCustomValidity("");
    passwordInput.value = "";
    setOwnerState(true);
    resetItemForm();
  } catch (error) {
    passwordInput.setCustomValidity(error.message || "Wrong password");
    passwordInput.reportValidity();
  }
});

logoutButton.addEventListener("click", async () => {
  if (firebaseReady) {
    await firebaseApi.signOut(firebaseApi.auth);
  }

  setOwnerState(false);
  resetItemForm();
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];

  if (!file) {
    selectedFile = null;
    selectedPhoto = "";
    previewImage.classList.add("is-hidden");
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedPhoto = reader.result;
    previewImage.src = selectedPhoto;
    previewImage.classList.remove("is-hidden");
  });
  reader.readAsDataURL(file);
});

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedFile || !selectedPhoto) {
    photoInput.setCustomValidity("Please add a photo");
    photoInput.reportValidity();
    return;
  }

  photoInput.setCustomValidity("");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  setStatus(firebaseReady ? "Uploading photo to Firebase..." : "Saving item...");

  try {
    const phone = phoneInput.value.replace(/[^\d]/g, "");
    const newItem = {
      id: makeId(),
      name: nameInput.value.trim(),
      price: Number(priceInput.value),
      phone,
      image: selectedPhoto
    };

    localStorage.setItem(PHONE_KEY, phone);

    if (firebaseReady) {
      await createFirebaseItem(newItem);
    } else {
      items = [newItem, ...items];
      saveLocalItems(items);
      renderProducts();
    }

    resetItemForm();
    setStatus("Item saved.");
    document.querySelector("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message || "Item could not be saved.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save Item";
  }
});

phoneInput.value = localStorage.getItem(PHONE_KEY) || "919876543210";
items = readLocalItems();
renderProducts();

try {
  await setupFirebase();
} catch {
  setStatus("Firebase is not connected yet. The site is using local browser storage.");
}
