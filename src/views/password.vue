<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { db, encryptContent, decryptContent } from "@/db";
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, Copy, Trash, Plus, Lock, Key, Mail, Globe, AlertCircle } from "lucide-vue-next";
import { sha256 } from "js-sha256";
import { TOTP, Secret } from "otpauth";

const newPassword = ref({ title: "", username: "", email: "", password: "", totpSecret: "", urls: "" });
const passwords = ref([]);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 5;
const showAddForm = ref(false);
const copiedField = ref(null);

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

const generateTOTP = (secret, period) => {
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: "SHA1",
      digits: 6,
      period,
    });
    return totp.generate();
  } catch (error) {
    return "Invalid Secret";
  }
};

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
    showAddForm.value = false;
    await loadPasswords();
  }
};

const removePassword = async (id) => {
  if (confirm("Are you sure you want to delete this password?")) {
    await db.passwords.delete(id);
    await loadPasswords();
  }
};

const toggleVisibility = (password) => {
  password.visible = !password.visible;
};

const copyToClipboard = (text, field) => {
  navigator.clipboard.writeText(text).then(() => {
    copiedField.value = field;
    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
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
      password.totp30 = generateTOTP(password.totpSecret, 30);
      password.totp60 = generateTOTP(password.totpSecret, 60);
    }
  });
}, 1000);

onMounted(loadPasswords);
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="m-auto container">
      <h1 class="text-4xl font-bold mb-8 text-gray-800 flex items-center">
        <Lock class="mr-4" size="36" />
        Password Manager
      </h1>

      <div class="mb-8 flex items-center justify-between">
        <div class="relative flex-grow mr-4">
          <input v-model="searchQuery" placeholder="Search passwords..." class="w-full pl-10 pr-4 py-2 rounded-full border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors" />
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
        </div>
        <button @click="showAddForm = !showAddForm" class="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors flex items-center">
          <Plus size="20" class="mr-2" />
          Add Password
        </button>
      </div>

      <div v-if="showAddForm" class="mb-8 p-6 bg-white rounded-xl shadow-lg transition-all duration-300 ease-in-out">
        <h2 class="text-2xl font-bold mb-4">Add New Password</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="relative">
            <input v-model="newPassword.title" placeholder="Title" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Key class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
          <div class="relative">
            <input v-model="newPassword.urls" placeholder="Website URLs" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Globe class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
          <div class="relative">
            <input v-model="newPassword.username" placeholder="Username" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
          <div class="relative">
            <input v-model="newPassword.email" placeholder="Email" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
          <div class="relative">
            <input v-model="newPassword.password" type="password" placeholder="Password" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Lock class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
          <div class="relative">
            <input v-model="newPassword.totpSecret" placeholder="TOTP (Optional)" class="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <Key class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="20" />
          </div>
        </div>

        <div class="flex space-x-4 mt-4" v-if="newPassword.totpSecret">
          <span class="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono">{{ generateTOTP(newPassword.totpSecret, 30) }}</span>
          <span class="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono">{{ generateTOTP(newPassword.totpSecret, 60) }}</span>
        </div>

        <button @click="addPassword" class="mt-6 bg-blue-500 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-600 transition-colors flex items-center justify-center">
          <Plus class="mr-2" size="20" />
          Add Password
        </button>
      </div>

      <div class="space-y-6 mb-8">
        <div v-for="password in paginatedPasswords" :key="password.id" class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-2xl font-semibold text-gray-800">{{ password.title }}</h3>
              <button @click="removePassword(password.id)" class="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-100 transition-colors">
                <Trash size="20" />
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="flex items-center space-x-2">
                <Mail size="20" class="text-gray-400" />
                <span class="text-gray-600">{{ password.username || password.email }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Globe size="20" class="text-gray-400" />
                <a :href="password.urls" target="_blank" class="text-blue-600 hover:underline">{{ password.urls }}</a>
              </div>
            </div>

            <div class="flex items-center space-x-2 mb-4">
              <div class="relative flex-grow">
                <input :type="password.visible ? 'text' : 'password'" :value="password.password" class="w-full p-2 pr-20 border rounded-lg bg-gray-50" readonly />
                <div class="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <button @click="toggleVisibility(password)" class="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200 transition-colors">
                    <Eye v-if="!password.visible" size="18" />
                    <EyeOff v-else size="18" />
                  </button>
                  <button @click="copyToClipboard(password.password, 'password-' + password.id)" class="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
                    <Copy v-if="copiedField !== 'password-' + password.id" size="18" />
                    <Check v-else size="18" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="password.totpSecret" class="bg-gray-100 p-4 rounded-lg">
              <h4 class="text-lg font-semibold mb-2">TOTP Codes</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-gray-600 mb-1">30-second code:</div>
                  <div class="flex items-center space-x-2">
                    <span class="bg-white px-3 py-1 rounded-lg text-lg font-mono flex-grow text-center">{{ password.totp30 }}</span>
                    <button @click="copyToClipboard(password.totp30, 'totp30-' + password.id)" class="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
                      <Copy v-if="copiedField !== 'totp30-' + password.id" size="18" />
                      <Check v-else size="18" />
                    </button>
                  </div>
                </div>
                <div>
                  <div class="text-sm text-gray-600 mb-1">60-second code:</div>
                  <div class="flex items-center space-x-2">
                    <span class="bg-white px-3 py-1 rounded-lg text-lg font-mono flex-grow text-center">{{ password.totp60 }}</span>
                    <button @click="copyToClipboard(password.totp60, 'totp60-' + password.id)" class="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors">
                      <Copy v-if="copiedField !== 'totp60-' + password.id" size="18" />
                      <Check v-else size="18" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center items-center space-x-4">
        <button @click="prevPage" :disabled="currentPage === 1" class="p-2 rounded-full bg-white shadow disabled:opacity-50 hover:bg-gray-100 transition-colors">
          <ChevronLeft size="24" />
        </button>
        <span class="text-lg font-medium">Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages" class="p-2 rounded-full bg-white shadow disabled:opacity-50 hover:bg-gray-100 transition-colors">
          <ChevronRight size="24" />
        </button>
      </div>

      <p v-if="filteredPasswords.length === 0" class="text-center text-gray-500 mt-8 text-lg flex items-center justify-center">
        <AlertCircle size="24" class="mr-2" />
        No passwords found matching your search.
      </p>
    </div>
  </div>
</template>
