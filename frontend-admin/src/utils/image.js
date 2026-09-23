// 图片元件统一的数据工具：创建、画布展示、导出生成三步共用同一套字段与口径

// 图片元件自带的示例图（内联 SVG 数据，保证离线也能正常显示与导出，且不会污染导出画布）
export const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="100" fill="#ecf5ff"/>' +
      '<rect x="1" y="1" width="98" height="98" fill="none" stroke="#409eff" stroke-width="2"/>' +
      '<circle cx="36" cy="36" r="10" fill="#e6a23c"/>' +
      '<path d="M12 88 L40 55 L58 74 L72 60 L90 88 Z" fill="#67c23a"/>' +
      '</svg>'
  )

export const SAMPLE_IMAGE_NAME = '示例图'

// 单张图片体积上限（dataURL 会再膨胀约 1/3，过大会导致本地持久化失败）
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

// 读取本地图片文件为 dataURL，失败时 reject 以便向用户说明
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

// 加载图片为 HTMLImageElement：先绑定回调再设置 src，避免缓存命中时回调丢失导致导出中途卡死
export function loadImage(src, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.onload = null
      img.onerror = null
      reject(new Error('图片加载超时'))
    }, timeout)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('图片加载失败'))
    }
    // 远程图片按跨域方式加载，避免污染导出画布导致 toDataURL/getImageData 抛错
    if (/^https?:\/\//.test(src)) img.crossOrigin = 'anonymous'
    img.src = src
  })
}

// 与画布预览 object-fit: contain 相同的口径：按比例缩放并居中，绝不拉伸变形
export function containRect(naturalWidth, naturalHeight, boxWidth, boxHeight) {
  if (!naturalWidth || !naturalHeight) {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight }
  }
  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight)
  const width = naturalWidth * scale
  const height = naturalHeight * scale
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height
  }
}
