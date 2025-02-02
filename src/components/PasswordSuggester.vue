<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-xl font-semibold text-gray-700 mb-4">Secure Password Suggester</h2>
    <div class="mb-6">
      <div class="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
        <p class="text-lg font-mono text-gray-800">{{ suggestedPassword }}</p>
        <button @click="copyToClipboard" class="text-blue-500 hover:text-blue-600 focus:outline-none transition duration-300 ease-in-out transform hover:scale-110">
          <ClipboardCopyIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <button @click="generatePassword" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
        Generate New Password
      </button>
      <div class="flex items-center">
        <RefreshCwIcon class="w-4 h-4 text-gray-500 mr-2" />
        <p class="text-sm text-gray-600">Refreshes in {{ countdown }}s</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ClipboardCopyIcon, RefreshCwIcon } from 'lucide-vue-next';

const suggestedPassword = ref('');
const countdown = ref(60);

const generatePassword = () => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]|:;<>,.?~';
  const length = Math.floor(Math.random() * (18 - 12 + 1)) + 12;
  suggestedPassword.value = Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => charset[x % charset.length])
    .join('');
  countdown.value = 60;
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(suggestedPassword.value)
    .then(() => {
      // You can add a more subtle notification here if desired
      console.log('Password copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy password: ', err);
    });
};

let intervalId;

onMounted(() => {
  generatePassword();
  intervalId = setInterval(() => {
    if (countdown.value > 1) {
      countdown.value--;
    } else {
      generatePassword();
    }
  }, 1000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>