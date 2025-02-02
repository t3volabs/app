<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-200 to-red-200 flex items-center justify-center p-4">
    <div class="bg-white bg-opacity-40 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden flex">
      <div v-if="!encryptionKeySet" class="w-full p-12 text-center">
        <h1 class="text-4xl font-semibold text-gray-800 mb-8">Set Master Password</h1>
        <input v-model="passwordInput" type="password" placeholder="Set Master Password" class="w-full max-w-md mx-auto p-4 text-lg border-0 rounded-lg bg-white bg-opacity-50 focus:bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200" />
        <button @click="setEncryptionKey" class="mt-6 px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-lg font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2">Save</button>
      </div>

      <div v-else-if="!isUnlocked" class="w-full p-12 text-center">
        <h1 class="text-4xl font-semibold text-gray-800 mb-8">Enter Master Password</h1>
        <input v-model="passwordInput" type="password" placeholder="Master Password" class="w-full max-w-md mx-auto p-4 text-lg border-0 rounded-lg bg-white bg-opacity-50 focus:bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200" />
        <button @click="unlockApp" class="mt-6 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">Unlock</button>
        <div v-if="error" class="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {{ error }}
        </div>
      </div>

      <template v-else>
        <nav class="w-24 bg-black text-yellow-400 bg-opacity-30 backdrop-blur-md">
          <div class="h-full flex flex-col items-center justify-between py-8">
            <div class="space-y-8">
              <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="block p-2 rounded-lg transition duration-200 group">
                <component :is="item.icon" class="w-8 h-8 group-hover:text-red-400 transition-colors duration-200" />
              </router-link>
            </div>
            <button @click="logout" class="p-2 rounded-lg transition duration-200 group">
              <LogOut class="w-8 h-8 group-hover:text-red-400 transition-colors duration-200" />
            </button>
          </div>
        </nav>

        <main class="flex-1 p-12 overflow-y-auto">
          <RouterView />
        </main>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, RouterView, RouterLink } from "vue-router";
import { Home, Bookmark, Key, FileText, Pickaxe, RefreshCw, LogOut } from "lucide-vue-next";
import { sha256 } from "js-sha256";

const encryptionKeySet = ref(!!localStorage.getItem("ENCRYPTION_KEY_HASH"));

const router = useRouter();

const passwordInput = ref("");

const isUnlocked = ref(false);

const error = ref("");

const setEncryptionKey = () => {
  if (passwordInput.value) {
    localStorage.setItem("ENCRYPTION_KEY_HASH", sha256(passwordInput.value));
    sessionStorage.setItem("ENCRYPTION_KEY", passwordInput.value);

    encryptionKeySet.value = true;
    passwordInput.value = "";
  }
};

const unlockApp = () => {
  if (sha256(passwordInput.value) === localStorage.getItem("ENCRYPTION_KEY_HASH")) {
    sessionStorage.setItem("ENCRYPTION_KEY", passwordInput.value);

    isUnlocked.value = true;
    passwordInput.value = "";
    error.value = "";
  } else {
    error.value = "Incorrect master password. Please try again.";
    passwordInput.value = "";
  }
};

const logout = () => {
  sessionStorage.removeItem("ENCRYPTION_KEY");
  isUnlocked.value = false;
  router.push("/");
};

const navItems = [
  { name: "Home", icon: Home, to: "/" },
  { name: "Bookmark", icon: Bookmark, to: "/bookmark" },
  { name: "Password", icon: Key, to: "/password" },
  { name: "Note", icon: FileText, to: "/note" },
  { name: "Backup", icon: RefreshCw, to: "/backup" },
  { name: "About", icon: Pickaxe, to: "/about" },
];
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

body {
  font-family: "Inter", sans-serif;
}
</style>

