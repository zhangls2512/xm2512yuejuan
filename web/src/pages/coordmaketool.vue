<script setup>
document.title = '智能阅卷系统 - 坐标制作工具'
import { ref } from 'vue'
import { findContours } from 'binary-contours'
import { readImage, saveFile } from '../util/file'
const canvasRef = ref(null)
const type = ref('anchor')
const optiondirection = ref('row')
const questioncount = ref(5)
const result = ref([])
let img
let width = 0
let height = 0
let gray
let x = 0
let y = 0
let drawing = false
let markers = []
let scalex = 0
let scaley = 0
async function chooseimage() {
  result.value = []
  markers = []
  redraw()
  const image = await readImage()
  img = new Image()
  img.onload = () => {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true
    })
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    const rect = canvasRef.value.getBoundingClientRect()
    scalex = canvasRef.value.width / rect.width
    scaley = canvasRef.value.height / rect.height
    const imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height)
    width = canvas.width
    height = canvas.height
    gray = new Uint8Array(canvas.width * canvas.height)
    for (let i = 0; i < imgdata.data.length; i += 4) {
      gray[i >> 2] = imgdata.data[i]
    }
    redraw()
  }
  img.src = image
}
function getPos(e) {
  return {
    x: e.offsetX * scalex,
    y: e.offsetY * scaley
  }
}
function onMouseDown(e) {
  drawing = true
  const p = getPos(e)
  x = p.x
  y = p.y
}
function onMouseMove(e) {
  if (drawing) {
    redraw()
    const p = getPos(e)
    const ctx = canvasRef.value.getContext('2d', {
      willReadFrequently: true
    })
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, p.x - x, p.y - y)
  }
}
function onMouseUp(e) {
  if (drawing) {
    drawing = false
    const p = getPos(e)
    const xa = Math.min(x, p.x)
    const ya = Math.min(y, p.y)
    const w = Math.abs(x - p.x)
    const h = Math.abs(y - p.y)
    processZone(xa, ya, w, h)
  }
}
function filterSimilarBoxes(arr) {
  const result = []
  arr.forEach(item => {
    if (!result.some(existing => Math.abs(item.rect[0] - existing.rect[0]) < 2 && Math.abs(item.rect[1] - existing.rect[1]) < 2 && Math.abs(item.rect[2] - existing.rect[2]) < 2 && Math.abs(item.rect[3] - existing.rect[3]) < 2)) {
      result.push(item)
    }
  })
  return result
}
function processZone(x, y, w, h) {
  const rx = Math.max(0, Math.round(x))
  const ry = Math.max(0, Math.round(y))
  const rw = Math.min(Math.round(w), width - rx)
  const rh = Math.min(Math.round(h), height - ry)
  const roigray = new Uint8Array(rw * rh)
  for (let row = 0; row < rh; row++) {
    for (let col = 0; col < rw; col++) {
      roigray[row * rw + col] = gray[(ry + row) * width + (rx + col)]
    }
  }
  const binary = new Uint8Array(rw * rh)
  for (let i = 0; i < roigray.length; i++) {
    binary[i] = roigray[i] < 128 ? 255 : 0
  }
  const contours = findContours(binary, {
    width: rw,
    height: rh
  })
  if (contours.length == 0) {
    redraw()
    return
  }
  if (type.value == 'anchor') {
    let best
    let maxarea = 0
    contours.forEach(item => {
      if (item.area > maxarea) {
        maxarea = item.area
        best = item
      }
    })
    if (best) {
      const cx = rx + best.boundingRect.x
      const cy = ry + best.boundingRect.y
      result.value.push({
        type: 'anchor',
        coord: [cx, cy]
      })
      markers.push({
        type: 'point',
        x: cx,
        y: cy
      })
    }
  }
  if (type.value == 'subjective') {
    let best
    let maxarea = 0
    contours.forEach(item => {
      if (item.area > maxarea) {
        maxarea = item.area
        best = item
      }
    })
    if (best) {
      const br = best.boundingRect
      const gx1 = rx + br.x
      const gy1 = ry + br.y
      const gx2 = gx1 + br.width
      const gy2 = gy1 + br.height
      result.value.push({
        type: 'subjective',
        coord: [gx1, gy1, gx2, gy2]
      })
      markers.push({
        type: 'rect',
        x: gx1,
        y: gy1,
        w: br.width,
        h: br.height
      })
    }
  }
  if (type.value == 'objective') {
    let options = []
    contours.forEach(item => {
      const br = item.boundingRect
      if (br.width > 12 && br.height > 10) {
        options.push({
          rect: [Math.round(rx + br.x), Math.round(ry + br.y), Math.round(rx + br.x + br.width), Math.round(ry + br.y + br.height)],
          cx: rx + br.x + br.width / 2,
          cy: ry + br.y + br.height / 2
        })
      }
    })
    options = filterSimilarBoxes(options)
    if (options.length == 0) {
      redraw()
      return
    }
    if (optiondirection.value == 'row') {
      options.sort((a, b) => Math.floor(a.cy / 10) - Math.floor(b.cy / 10) || a.cx - b.cx)
    }
    if (optiondirection.value == 'column') {
      options.sort((a, b) => Math.floor(a.cx / 10) - Math.floor(b.cx / 10) || a.cy - b.cy)
    }
    const optioncount = Math.ceil(options.length / questioncount.value)
    for (let i = 0; i < options.length; i += optioncount) {
      const rects = options.slice(i, i + optioncount).map(b => b.rect)
      result.value.push({
        type: 'objective',
        options: rects
      })
      rects.forEach(r => {
        markers.push({
          type: 'rect',
          x: r[0],
          y: r[1],
          w: r[2] - r[0],
          h: r[3] - r[1]
        })
      })
    }
  }
  redraw()
}
function redraw() {
  try {
    const ctx = canvasRef.value.getContext('2d', {
      willReadFrequently: true
    })
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    ctx.drawImage(img, 0, 0)
    markers.forEach(m => {
      if (m.type == 'point') {
        ctx.fillStyle = 'red'
        ctx.beginPath()
        ctx.arc(m.x, m.y, 5, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.strokeRect(m.x, m.y, m.w, m.h)
      }
    })
  } catch {
  }
}
function exportjson() {
  saveFile(JSON.stringify(result.value), '坐标.json')
}
function deleteItem(index) {
  const item = result.value[index]
  if (item.type == 'anchor') {
    const markerindex = markers.findIndex(itema => itema.x == item.coord[0] && itema.y == item.coord[1])
    markers.splice(markerindex, 1)
  }
  if (item.type == 'objective') {
    const firstoption = item.options[0]
    const firstmarkerindex = markers.findIndex(item => item.x == firstoption[0] && item.y == firstoption[1])
    markers.splice(firstmarkerindex, item.options.length)
  }
  if (item.type == 'subjective') {
    const markerindex = markers.findIndex(itema => itema.x == item.coord[0] && itema.y == item.coord[1])
    markers.splice(markerindex, 1)
  }
  result.value.splice(index, 1)
  redraw()
}
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="sp">
        <img class="tx" src="/logo.png"></img>
        <div class="header-title">坐标制作工具</div>
      </div>
    </div>
    <div class="main" style="flex:1">
      <div class="sp" style="flex:1">
        <canvas ref="canvasRef" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp"
          style="flex:1;min-width:0"></canvas>
        <div class="cz" style="align-self:flex-start;flex:1">
          <div class="sp">
            <tiny-button type="info" @click="chooseimage">选择图片</tiny-button>
            <div><tiny-button type="success" @click="exportjson">导出JSON</tiny-button></div>
          </div>
          <div class="large-bold-text">配置</div>
          <div class="sp">
            <div class="bold-text">类型</div>
            <tiny-radio-group v-model="type">
              <tiny-radio label="anchor">定位点</tiny-radio>
              <tiny-radio label="objective">客观题</tiny-radio>
              <tiny-radio label="subjective">主观题</tiny-radio>
            </tiny-radio-group>
          </div>
          <div v-if="type == 'objective'" class="sp">
            <div class="bold-text">选项排列</div>
            <tiny-radio-group v-model="optiondirection">
              <tiny-radio label="row">横向</tiny-radio>
              <tiny-radio label="column">纵向</tiny-radio>
            </tiny-radio-group>
          </div>
          <div v-if="type == 'objective'" class="sp">
            <div class="bold-text">题目数量</div>
            <tiny-numeric v-model="questioncount" step-strictly :min="1" :max="10"></tiny-numeric>
          </div>
          <div class="large-bold-text">元素</div>
          <div v-for="item, index in result">
            <div v-if="item.type == 'anchor'" class="sp">
              <tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button>
              <div class="bold-text">定位点</div>
              <div>（{{ item.coord[0] }}，{{ item.coord[1] }}）</div>
            </div>
            <div v-if="item.type == 'objective'" class="sp">
              <tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button>
              <div class="bold-text">客观题</div>
              <div class="cz">
                <div v-for="option, optionindex in item.options">选项{{ optionindex + 1 }}：（{{ option[0]
                }}，{{ option[1] }}，{{ option[2] }}，{{ option[3] }}）</div>
              </div>
            </div>
            <div v-if="item.type == 'subjective'" class="sp">
              <tiny-button type="danger" @click="deleteItem(index)">删除</tiny-button>
              <div class="bold-text">主观题</div>
              <div>（{{ item.coord[0] }}，{{ item.coord[1] }}，{{ item.coord[2] }}，{{ item.coord[3] }}）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>