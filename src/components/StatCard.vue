<template>
    <div class="bg-white rounded-lg shadow-md p-6 transition duration-300 ease-in-out transform hover:scale-105">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-700">{{ title }}</h2>
        <component :is="icon" :class="`w-8 h-8 text-${color}-500`" />
      </div>
      <div :class="`h-1 w-16 bg-${color}-500 mb-4`"></div>
      <p class="text-3xl font-bold text-gray-800">{{ count }}</p>
      <p class="text-sm text-gray-500 mt-2">Total {{ title }}</p>
    </div>
  </template>
  
  <script setup>
  defineProps({
    title: String,
    count: Number,
    icon: Object,
    color: String,
  });
  </script>