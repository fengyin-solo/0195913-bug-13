import { ElMessage } from 'element-plus'
import { useCanvasStore } from '@/stores/canvas'
import { readFileAsDataURL, MAX_IMAGE_SIZE } from '@/utils/image'

// 选图统一入口：画布占位符与属性面板共用，保证校验、提示、写回字段（src / imageName）口径一致
export function useImagePicker() {
  const store = useCanvasStore()

  const applyImageFile = async (element, file) => {
    if (!element || !file) return
    if (!file.type.startsWith('image/')) {
      ElMessage.warning(`「${file.name}」不是图片文件，请重新选择`)
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      ElMessage.warning(`图片「${file.name}」超过 10MB，可能导致页面数据无法保存，请压缩后再试`)
      return
    }
    let dataUrl
    try {
      dataUrl = await readFileAsDataURL(file)
    } catch (err) {
      console.error('图片读取失败:', err)
      ElMessage.error(`图片「${file.name}」读取失败，请重试或更换图片`)
      return
    }
    if (element.src === dataUrl) {
      ElMessage.info(`「${file.name}」与当前图片相同，未重复添加`)
      return
    }
    store.updateElement(element.id, { src: dataUrl, imageName: file.name })
    ElMessage.success(`图片「${file.name}」已加载`)
  }

  // 打开文件选择框后又取消：明确告知图片未被改动
  const notifyPickCancel = () => ElMessage.info('已取消选择，图片保持原样')

  return { applyImageFile, notifyPickCancel }
}
