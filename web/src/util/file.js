export async function readFile() {
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
export async function readImage() {
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