<template>
  <div class="flex flex-col md:flex-row">
    <div class="md:w-2/3 p-8 md:p-12 lg:p-16">
      <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Open Source <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">for Everyone</span></h2>
      <p class="text-xl text-gray-700 mb-8 leading-relaxed">We believe in the power of community-driven development. That's why T3VO is open source and available for anyone to contribute to or use. Join us in shaping the future of password management!</p>
    </div>
    <div class="md:w-1/3 p-8 md:p-12 flex flex-col justify-center space-y-4">
      <a
        href="https://github.com/t3volabs"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <GithubIcon class="h-5 w-5 mr-2" />
        View on GitHub
      </a>
      <a href="https://github.com/t3volabs/issues" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
        <AlertCircleIcon class="h-5 w-5 mr-2" />
        Report an Issue
      </a>
    </div>
  </div>
</template>

<script setup>
import { GithubIcon, AlertCircleIcon } from "lucide-vue-next";
</script>
