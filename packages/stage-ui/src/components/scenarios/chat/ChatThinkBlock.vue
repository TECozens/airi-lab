<script setup lang="ts">
import Collapsable from '../../misc/Collapsable.vue'
import MarkdownRenderer from '../../markdown/MarkdownRenderer.vue'

const props = defineProps<{
  thinkContent: string
}>()
</script>

<template>
  <Collapsable
    :class="[
      'bg-amber-100/40 dark:bg-amber-900/60 rounded-lg px-2 pb-2 pt-2',
      'flex flex-col gap-2 items-start',
    ]"
    :default="false"
  >
    <template #trigger="{ visible, setVisible }">
      <button
        :class="[
          'w-full text-start',
        ]"
        @click="setVisible(!visible)"
      >
        <div i-solar:brain-bold-duotone class="mr-1 inline-block translate-y-1 op-50" />
        <span class="text-xs op-70">Thinking process</span>
      </button>
    </template>
    <div
      :class="[
        'rounded-md p-2 w-full',
        'bg-neutral-100/80 text-sm text-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200',
      ]"
    >
      <MarkdownRenderer
        :content="thinkContent"
        class="break-words"
      />
    </div>
  </Collapsable>
</template>

