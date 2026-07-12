const sharp = require('sharp')
async function cropImage(image, coord) {
  try {
    const imagebase64 = image.split(',')[1]
    const inputbuffer = Buffer.from(imagebase64, 'base64')
    const task = await sharp(inputbuffer)
    const meta = await task.metadata()
    const width = coord[2] - coord[0]
    const height = coord[3] - coord[1]
    const outputbuffer = await task.extract({
      left: coord[0],
      top: coord[1],
      width: width,
      height: height
    }).toBuffer()
    return 'data:image/' + meta.format + ';base64,' + outputbuffer.toString('base64')
  } catch {
    return ''
  }
}
async function getImageInfo(image) {
  try {
    const imagebase64 = image.split(',')[1]
    const buffer = Buffer.from(imagebase64, 'base64')
    const meta = await sharp(buffer).metadata()
    return {
      width: meta.width,
      height: meta.height
    }
  } catch {
    return ''
  }
}
module.exports = {
  cropImage,
  getImageInfo
}