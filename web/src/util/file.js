export function readFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
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
    input.click()
  })
}
export function readImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.jpg,.jpeg,.png,.webp'
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
export function createTransparentImage(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const base64 = canvas.toDataURL('image/png')
  return base64
}