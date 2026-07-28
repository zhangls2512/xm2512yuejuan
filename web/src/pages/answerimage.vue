<script setup>
import { ref } from 'vue'
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})
const i = ref(null)
const c = ref(null)
function draw() {
  const img = i.value
  const canvas = c.value
  const ctx = canvas.getContext('2d')
  const w = img.naturalWidth
  const h = img.naturalHeight
  canvas.width = w
  canvas.height = h
  canvas.style.width = '100%'
  canvas.style.height = 'auto'
  ctx.drawImage(img, 0, 0)
  props.data.trace.forEach(item => {
    if (item.type == 'image') {
      drawImage(ctx, item)
    }
    if (item.type == 'text') {
      drawText(ctx, item)
    }
    if (item.type == 'rect') {
      drawRect(ctx, item)
    }
  })
}
function drawImage(ctx, item) {
  const [x, y] = getCoord(item)
  const img = new Image()
  img.src = item.content ? item.content : '/transparent.png'
  img.onload = () => {
    const w = img.naturalWidth
    const h = img.naturalHeight
    const {
      x: ox,
      y: oy
    } = offset(item, w, h)
    ctx.drawImage(img, x + ox, y + oy)
  }
}
function drawText(ctx, item) {
  const [x, y] = getCoord(item)
  const fontSize = item.size
  ctx.font = fontSize + 'px sans-serif'
  ctx.fillStyle = 'red'
  ctx.textBaseline = 'top'
  const lines = item.content.split('\n')
  lines.forEach((line, index) => {
    const w = ctx.measureText(line).width
    const {
      x: ox,
      y: oy
    } = offset(item, w, fontSize)
    ctx.fillText(line, x + ox, y + oy + index * fontSize * 1.2)
  })
}
function drawRect(ctx, item) {
  const [x1, y1, x2, y2] = item.coord
  ctx.strokeStyle = item.color
  ctx.lineWidth = 2
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
}
function offset(item, w = 0, h = 0) {
  switch (item.position) {
    case 'righttop':
      return {
        x: -w,
        y: 0
      }
    case 'rightbottom':
      return {
        x: -w,
        y: -h
      }
    default:
      return {
        x: 0,
        y: 0
      }
  }
}
function getCoord(item, w = 0, h = 0) {
  if (item.coord) {
    return item.coord
  }
  const canvas = c.value
  const cw = canvas.width
  const ch = canvas.height
  switch (item.position) {
    case 'righttop':
      return [cw, 0]
    case 'rightbottom':
      return [cw, ch]
    default:
      return [0, 0]
  }
}
</script>

<template>
  <img ref="i" :src="data.answerImage || '/noimage.png'" @load="draw" style="display:none" loading="lazy"></img>
  <canvas ref="c"></canvas>
</template>