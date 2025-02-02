<template>
  <div class="m-auto p-4">
    <div class="mb-6 p-4 border rounded-lg bg-gray-50 shadow">
      <input v-model="newPassword.title" placeholder="Title" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newPassword.urls" placeholder="Website URLs" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newPassword.username" placeholder="Username" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newPassword.email" placeholder="Email" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newPassword.password" type="password" placeholder="Password" class="w-full p-2 mb-2 border rounded" />
      <input v-model="newPassword.totpSecret" placeholder="TOTP (Optional)" class="w-full p-2 mb-2 border rounded" />
      <button @click="addPassword" class="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 transition-colors">Add Password</button>
    </div>

    <div class="mb-4 relative">
      <input v-model="searchQuery" placeholder="Search passwords..." class="w-full p-2 pl-10 border rounded-lg" />
      <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
    </div>

    <ul class="space-y-4 mb-4">
      <li v-for="password in paginatedPasswords" :key="password.id" class="p-4 border rounded-lg bg-white shadow hover:shadow-md transition-shadow">
        <div class="flex justify-between items-center">
          <div class="flex-grow">
            <p class="font-bold">{{ password.title }}</p>
            <p class="text-gray-500 text-sm">{{ password.username }} | {{ password.email }}</p>
            <p class="text-blue-600 hover:underline">{{ password.urls }}</p>

            <div class="flex items-center space-x-2 mt-2">
              <input :type="password.visible ? 'text' : 'password'" :value="password.password" class="p-1 border rounded w-48" readonly />
              <button @click="toggleVisibility(password)" class="text-gray-600 hover:text-gray-800">
                <EyeIcon v-if="!password.visible" size="20" />
                <EyeOffIcon v-else size="20" />
              </button>
              <button @click="copyToClipboard(password.password)" class="text-blue-500 hover:text-blue-700">
                <CopyIcon size="20" />
              </button>
            </div>

            <div v-if="password.totpSecret" class="mt-2 flex items-center space-x-2">
              <span class="bg-gray-200 px-3 py-1 rounded text-lg font-mono">{{ password.totp }}</span>
              <button @click="copyToClipboard(password.totp)" class="text-blue-500 hover:text-blue-700">
                <CopyIcon size="20" />
              </button>
            </div>
          </div>

          <button @click="removePassword(password.id)" class="text-red-500 hover:text-red-700 p-1">
            <TrashIcon size="20" />
          </button>
        </div>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronLeftIcon size="20" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-3 py-1 rounded-full" :class="page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200'">{{ page }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50">
        <ChevronRightIcon size="20" />
      </button>
    </div>

    <p v-if="filteredPasswords.length === 0" class="text-center text-gray-500 mt-4">No passwords found matching your search.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { db, encryptContent, decryptContent } from "@/db";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, CopyIcon, TrashIcon } from "lucide-vue-next";
import { sha256 } from "js-sha256";
import { TOTP, Secret } from "otpauth";

async function pushToPasswords(title, username, email, password, totpSecret, urls) {
  await db.passwords.add({
    id: sha256(title + username + email + password + urls),
    title,
    username: encryptContent(username),
    email: encryptContent(email),
    password: encryptContent(password),
    totpSecret: encryptContent(totpSecret),
    urls,
    updated_at: new Date().getTime(),
  });
}

const generateTOTP = (secret) => {
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    return totp.generate();
  } catch (error) {
    return "Invalid Secret";
  }
};

const newPassword = ref({ title: "", username: "", email: "", password: "", totpSecret: "", urls: "" });
const passwords = ref([]);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;

const loadPasswords = async () => {
  const rawPasswords = await db.passwords.orderBy("updated_at").reverse().toArray();
  passwords.value = rawPasswords.map((password) => ({
    ...password,
    username: decryptContent(password.username),
    email: decryptContent(password.email),
    password: decryptContent(password.password),
    totpSecret: password.totpSecret ? decryptContent(password.totpSecret) : "",
    urls: password.urls,
    totp: "",
    visible: false,
  }));
};

const addPassword = async () => {
  if (newPassword.value.title && newPassword.value.password) {
    await pushToPasswords(newPassword.value.title, newPassword.value.username, newPassword.value.email, newPassword.value.password, newPassword.value.totpSecret, newPassword.value.urls);
    newPassword.value = { title: "", username: "", email: "", password: "", totpSecret: "", urls: "" };
    await loadPasswords();
  }
};

const removePassword = async (id) => {
  await db.passwords.delete(id);
  passwords.value = passwords.value.filter((password) => password.id !== id);
};

const toggleVisibility = (password) => {
  password.visible = !password.visible;
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
};

const filteredPasswords = computed(() => {
  if (!searchQuery.value) return passwords.value;
  const query = searchQuery.value.toLowerCase();
  return passwords.value.filter((password) => password.title.toLowerCase().includes(query) || password.username.toLowerCase().includes(query) || password.email.toLowerCase().includes(query) || password.urls.toLowerCase().includes(query));
});

const paginatedPasswords = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredPasswords.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPages = computed(() => Math.ceil(filteredPasswords.value.length / itemsPerPage));

const goToPage = (page) => {
  currentPage.value = page;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

watch(
  () => newPassword.value.urls,
  (newVal) => {
    if (newVal) {
      try {
        newPassword.value.title = new URL(newVal).hostname.replace("www.", "");
      } catch (e) {}
    }
  }
);

setInterval(() => {
  passwords.value.forEach((password) => {
    if (password.totpSecret) {
      password.totp = generateTOTP(password.totpSecret);
    }
  });
}, 1000 * 2);

onMounted(loadPasswords);
</script>
