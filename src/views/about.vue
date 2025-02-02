<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <h2 class="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Open Source <span class="text-blue-600">for Everyone</span></h2>
    <p class="text-xl text-gray-700 mb-8 leading-relaxed">We believe in the power of community-driven development. That's why T3VO is open source and available for anyone to contribute to or use. Join us in shaping the future of password management!</p>

    <div class="flex flex-wrap gap-4">
      <a href="https://github.com/t3volabs" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-150 ease-in-out">
        <GithubIcon class="h-5 w-5 mr-2" />
        View on GitHub
      </a>
    </div>
  </div>
</template>

<script setup>
import { GithubIcon } from "lucide-vue-next";
</script>
