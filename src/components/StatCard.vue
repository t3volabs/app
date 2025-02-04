<template>
  <div class="bg-white rounded-lg shadow-md p-6 transition duration-300 ease-in-out transform hover:scale-105">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-gray-700">{{ title }}</h2>
    </div>
    <div :class="`h-1 w-16 bg-blue-500 mb-4`"></div>
    <p class="text-3xl font-bold text-gray-800">{{ count }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  count: Number,
});
</script>
