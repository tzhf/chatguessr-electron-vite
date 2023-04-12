<template>
  <div ref="scoreboardContainer" class="cg-scoreboard-container"></div>
  <div class="cg-menu">
    <button class="cg-button" title="settings" @click="openSettings">
      <span class="cg-icon cg-icon--gear"></span>
    </button>
    <button class="cg-button" title="Show/Hide scoreboard">
      <span class="cg-icon cg-icon--eyeClosed"></span>
    </button>
    <button class="cg-button" title="Center view">
      <span class="cg-icon cg-icon--flag"></span>
    </button>
    <span style="color: #fff">{{ test }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const test = ref(0)
function openSettings() {
  test.value++
  console.log(test.value)
}
</script>

<style scoped>
.cg-scoreboard-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.cg-menu {
  z-index: 99998;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 100px;
  position: fixed;
  right: 7px;
}

.cg-button {
  box-sizing: content-box;
  display: flex;
  user-select: none;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 50px;
  padding: 0.5rem;
  width: 1.7rem;
  height: 1.7rem;
  transition: 0.3s;
  cursor: pointer;
}

.cg-button:hover {
  background: rgba(0, 0, 0, 0.5);
}

.cg-icon {
  background-size: contain;
  width: 100%;
  height: 100%;
}

.cg-icon--gear {
  background-image: url(asset:icons/gear.svg);
}

.cg-icon--eyeOpen {
  background-image: url(asset:icons/opened_eye.svg);
}

.cg-icon--eyeClosed {
  background-image: url(asset:icons/closed_eye.svg);
}

.cg-icon--flag {
  background-image: url(asset:icons/start-flag.svg);
}
</style>
