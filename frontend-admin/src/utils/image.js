/**
 * 图片元件统一数据模型（创建 / 展示 / 导出三步共用，避免字段与口径不一致）：
 * - imageData:   图片内容（data URL，始终以此字段作为唯一图片数据源）
 * - imageName:   图片名称（文件原名 / 内置示例图名称，属性面板预览与图层列表共用）
 * - imageSize:   原始文件大小（字节，用于判断是否重复选择同一张文件）
 * - imageWidth / imageHeight: 图片自然像素尺寸（等比缩放口径的依据）
 */

// 内置示例图：本地内联 SVG（data URL），不依赖网络，拖入即可见
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#eef5ff"/>
  <circle cx="86" cy="30" r="13" fill="#ffd666"/>
  <path d="M0 95 L33 55 L57 83 L76 62 L120 103 V120 H0 Z" fill="#7ab8ff"/>
  <path d="M0 108 L27 75 L51 100 L73 77 L120 111 V120 H0 Z" fill="#409eff"/>
  <rect x="8" y="8" width="104" height="104" rx="6" fill="none" stroke="#409eff" stroke-width="2" stroke-dasharray="6 4"/>
</svg>`

export const SAMPLE_IMAGE_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_SVG)}`
export const SAMPLE_IMAGE_NAME = '示例图片'
export const SAMPLE_IMAGE_WIDTH = 120
export const SAMPLE_IMAGE_HEIGHT = 120

export class ImageFileError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ImageFileError'
    this.code = code // 'type' | 'read' | 'decode'
  }
}

/**
 * 加载并完整解码一张图片。
 * 校验 naturalWidth/naturalHeight，避免加载不完整 / 格式异常时拿到空白图继续绘制；
 * onerror 与超时均以失败返回，绝不静默成功。
 */
export function loadImageElement(src, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      img.onload = null
      img.onerror = null
      reject(new ImageFileError('图片加载超时（网络慢或数据未加载完整）', 'decode'))
    }, timeoutMs)

    img.onload = () => {
      if (settled) return
      clearTimeout(timer)
      if (!img.naturalWidth || !img.naturalHeight) {
        settled = true
        reject(new ImageFileError('图片解码后尺寸为 0（格式不受支持或数据不完整）', 'decode'))
        return
      }
      settled = true
      resolve(img)
    }

    img.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new ImageFileError('图片解码失败（格式不受支持或数据损坏、不完整）', 'decode'))
    }

    img.src = src
  })
}

/**
 * 与画布展示相同的口径绘制图片：object-fit: contain
 * 等比缩放到元件框内、居中放置，不拉伸变形，留空白区域由底色填充。
 */
export function containDraw(ctx, img, boxWidth, boxHeight) {
  const naturalWidth = img.naturalWidth || img.width
  const naturalHeight = img.naturalHeight || img.height
  if (!naturalWidth || !naturalHeight) return
  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight)
  const drawWidth = Math.max(1, naturalWidth * scale)
  const drawHeight = Math.max(1, naturalHeight * scale)
  const dx = (boxWidth - drawWidth) / 2
  const dy = (boxHeight - drawHeight) / 2
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
}

/**
 * 读取用户选择的图片文件为 data URL，并校验类型。
 */
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new ImageFileError('未选择任何文件', 'type'))
      return
    }
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new ImageFileError(`「${file.name}」不是图片文件，支持 PNG / JPG / GIF / BMP / WebP / SVG 等图片格式`, 'type'))
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => resolve({
      dataUrl: event.target.result,
      name: file.name,
      size: file.size
    })
    reader.onerror = () => {
      reject(new ImageFileError(`「${file.name}」读取失败，文件可能已损坏或未读取完整，请重试`, 'read'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 统一处理用户选择的图片文件：类型校验 → 重复选择判断 → 读取 → 完整解码。
 * @param {File} file 用户选择的文件
 * @param {Object} current 当前元件的图片信息（用于判断是否同一张文件）
 * @returns {Promise<{same?: boolean, name?: string, dataUrl?: string, size?: number, width?: number, height?: number}>}
 */
export async function resolveImageFile(file, current = {}) {
  if (!file.type || !file.type.startsWith('image/')) {
    throw new ImageFileError(`「${file.name}」不是图片文件，支持 PNG / JPG / GIF / BMP / WebP / SVG 等图片格式`, 'type')
  }

  // input 在每次打开前都会清空 value，因此同名文件可以重复触发 change；
  // 名称与大小均相同视为同一张文件，明确告知用户无需更换。
  if (current.imageName === file.name && current.imageSize === file.size && current.imageData) {
    return { same: true, name: file.name }
  }

  const data = await readImageFile(file)
  // 落库前先完整解码一次，慢加载 / 格式异常 / 数据不完整在此处暴露，而不是等导出时才发现
  const img = await loadImageElement(data.dataUrl, 30000)

  return {
    dataUrl: data.dataUrl,
    name: data.name,
    size: data.size,
    width: img.naturalWidth,
    height: img.naturalHeight
  }
}
