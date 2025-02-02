<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold mb-4">Add New Password</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input v-model="newPassword.title" placeholder="Title" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input v-model="newPassword.urls" placeholder="Website URLs" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input v-model="newPassword.username" placeholder="Username" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input v-model="newPassword.email" placeholder="Email" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input v-model="newPassword.password" type="password" placeholder="Password" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input v-model="newPassword.totpSecret" placeholder="TOTP (Optional)" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>

      <div class="flex space-x-4 mt-4" v-if="newPassword.totpSecret">
        <span class="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono">{{ generateTOTP30(newPassword.totpSecret) }}</span>
        <span class="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono">{{ generateTOTP60(newPassword.totpSecret) }}</span>
      </div>

      <button @click="addPassword" class="mt-6 bg-blue-500 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-600 transition-colors flex items-center justify-center">
        <PlusIcon class="mr-2" size="20" />
        Add Password
      </button>
    </div>

    <div class="mb-6 relative">
      <input v-model="searchQuery" placeholder="Search passwords..." class="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <SearchIcon class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size="24" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div v-for="password in paginatedPasswords" :key="password.id" class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-semibold text-gray-800">{{ password.title }}</h3>
            <button @click="removePassword(password.id)" class="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-100 transition-colors">
              <TrashIcon size="20" />
            </button>
          </div>
          <p class="text-sm text-gray-600 mb-2">{{ password.username }} | {{ password.email }}</p>
          <p class="text-sm text-blue-600 hover:underline mb-4">{{ password.urls }}</p>

          <div class="flex items-center space-x-2 mb-4">
            <input :type="password.visible ? 'text' : 'password'" :value="password.password" class="p-2 border rounded-lg w-full bg-gray-50" readonly />
            <button @click="toggleVisibility(password)" class="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100">
              <EyeIcon v-if="!password.visible" size="20" />
              <EyeOffIcon v-else size="20" />
            </button>
            <button @click="copyToClipboard(password.password)" class="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100">
              <CopyIcon size="20" />
            </button>
          </div>

          <div v-if="password.totpSecret" class="mt-4 space-y-2">
            <div class="flex items-center space-x-2">
              <span class="bg-gray-100 px-3 py-1 rounded-lg text-lg font-mono flex-grow text-center">{{ password.totp30 }}</span>
              <button @click="copyToClipboard(password.totp30)" class="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100">
                <CopyIcon size="20" />
              </button>
            </div>
            <div class="flex items-center space-x-2">
              <span class="bg-gray-100 px-3 py-1 rounded-lg text-lg font-mono flex-grow text-center">{{ password.totp60 }}</span>
              <button @click="copyToClipboard(password.totp60)" class="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100">
                <CopyIcon size="20" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2">
      <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronLeftIcon size="24" />
      </button>
      <span v-for="page in totalPages" :key="page" @click="goToPage(page)" class="cursor-pointer px-4 py-2 rounded-full text-lg font-medium transition-colors" :class="page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'">
        {{ page }}
      </span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors">
        <ChevronRightIcon size="24" />
      </button>
    </div>

    <p v-if="filteredPasswords.length === 0" class="text-center text-gray-500 mt-8 text-lg">No passwords found matching your search.</p>
  </div>
</template>       

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { db, encryptContent, decryptContent } from "@/db";
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, CopyIcon, TrashIcon, PlusIcon} from "lucide-vue-next";
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

const generateTOTP30 = (secret) => {
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

const generateTOTP60 = (secret) => {
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: "SHA1",
      digits: 6,
      period: 60,
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
    totp30: "",
    totp60: "",
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
      password.totp30 = generateTOTP30(password.totpSecret);
      password.totp60 = generateTOTP60(password.totpSecret);
    }
  });
}, 1000 * 2);

onMounted(loadPasswords);
</script>
