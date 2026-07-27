<script setup>
import { ref } from 'vue'
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})
function formatScoringRate(a) {
  return a.cellValue + '%'
}
</script>

<template>
  <tiny-grid :data="data" border>
    <tiny-grid-column field="name" title="知识点名称" align="center"></tiny-grid-column>
    <tiny-grid-column field="questionName" title="题号" :format-text="formatQuestionName"
      align="center"></tiny-grid-column>
    <tiny-grid-column field="scoringRate" title="得分率" :format-text="formatScoringRate" sortable
      align="center"></tiny-grid-column>
  </tiny-grid>
</template>