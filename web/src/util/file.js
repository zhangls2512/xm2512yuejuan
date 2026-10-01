export function readFile(houzhui = 'json') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.' + houzhui
    input.onchange = () => {
      const file = input.files[0]
      if (!file) {
        resolve('')
      }
      if (file) {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve('')
      }
    }
    input.oncancel = () => resolve('')
    input.click()
  })
}
function readFileBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve('')
  })
}
export function readImageDirectory(count = 0) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.onchange = async () => {
      const files = [...input.files].filter(item => item.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name))
      const result = []
      for (let i = 0; i < count * Math.ceil(files.length / count); i++) {
        const file = files[i]
        if (!file) {
          result.push('')
        }
        if (file) {
          const base64 = await readFileBase64(file)
          result.push(base64)
        }
      }
      resolve(result)
    }
    input.oncancel = () => resolve([])
    input.click()
  })
}
export function readImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.jpg,.jpeg,.png,.webp,.heic'
    input.onchange = () => {
      const file = input.files[0]
      if (!file) {
        resolve('')
      }
      if (file) {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve('')
      }
    }
    input.oncancel = () => resolve('')
    input.click()
  })
}
export function getImageSize(base64) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      })
    }
    img.src = base64
  })
}
export function getTransparentImage(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas.toDataURL('image/png')
}
export function saveFile(content, filename) {
  const blob = new Blob([content])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}