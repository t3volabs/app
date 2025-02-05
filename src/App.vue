<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-200 to-red-200 flex items-center justify-center p-4 sm:p-0">
    <div class="bg-white bg-opacity-40 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row w-full max-w-6xl h-[calc(100vh-2rem)] sm:h-[90vh]">
      <div v-if="!isUnlocked" class="w-full p-6 sm:p-12 text-center flex flex-col justify-center">
        <h1 class="text-3xl sm:text-4xl font-semibold text-gray-800 mb-8">Enter Master Password</h1>
        <input v-model="passwordInput" type="password" placeholder="Master Password" class="w-full max-w-md mx-auto p-4 text-lg border-0 rounded-lg bg-white bg-opacity-50 focus:bg-opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200" />
        <button @click="unlockApp" class="mt-6 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">Unlock</button>
      </div>

      <template v-else>
        <nav class="w-full sm:w-24 bg-black text-yellow-400 bg-opacity-30 backdrop-blur-md">
          <div class="flex sm:flex-col items-center justify-between p-4 sm:py-8 sm:h-full">
            <div class="flex sm:flex-col space-x-4 sm:space-x-0 sm:space-y-8">
              <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="block p-2 rounded-lg transition duration-200 group">
                <component :is="item.icon" class="w-6 h-6 sm:w-8 sm:h-8 group-hover:text-red-400 transition-colors duration-200" />
              </router-link>
            </div>
          </div>
        </nav>

        <main class="flex-1 p-6 sm:p-12 overflow-y-auto" v-if="isUnlocked">
          <RouterView />
        </main>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Home, Bookmark, Key, FileText, Pickaxe, RefreshCw, Import } from "lucide-vue-next";

const isUnlocked = ref(false);
const passwordInput = ref("");
const router = useRouter();

const unlockApp = () => {
  sessionStorage.setItem("ENCRYPTION_KEY", passwordInput.value);
  passwordInput.value = "";
  location.reload();
};

onMounted(() => {
  if (sessionStorage.getItem("ENCRYPTION_KEY")) {
    isUnlocked.value = true;
  }
});

const navItems = [
  { name: "Home", icon: Home, to: "/" },
  { name: "Bookmark", icon: Bookmark, to: "/bookmark" },
  { name: "Password", icon: Key, to: "/password" },
  { name: "Note", icon: FileText, to: "/note" },
  { name: "Import", icon: Import, to: "/import" },
  { name: "Backup", icon: RefreshCw, to: "/backup" },
  { name: "About", icon: Pickaxe, to: "/about" },
];
</script>

<style>
body {
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
