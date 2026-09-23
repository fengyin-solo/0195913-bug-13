import { ref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 统一的图片文件选择器：
 * - 每次打开前清空 input.value，使「重复挑到同一张图」也能正常触发 change，
 *   是否为同一张文件交由业务侧（resolveImageFile）判断并说明原因；
 * - 用户挑完又取消（关闭文件对话框）时，通过 cancel 事件 / 窗口聚焦兜底给出说明，
 *   原有图片保持不变；
 * - 同一次选择最多反馈一次，避免 cancel 与 change 同时触发时重复提示。
 */
export function useImagePicker({ onPick } = {}) {
  const inputRef = ref(null)
  let pending = false
  let settled = false
  let focusTimer = null

  const cleanup = () => {
    pending = false
    window.removeEventListener('focus', handleWindowFocus)
  }

  const handleWindowFocus = () => {
    if (!pending) return
    // 关闭系统文件对话框后窗口会重新获得焦点；若 change 未随后触发即为取消
    focusTimer = window.setTimeout(() => {
      if (!pending) return
      if (!settled) {
        settled = true
        ElMessage.info('已取消选择，图片保持不变')
      }
      cleanup()
    }, 300)
  }

  const triggerPick = () => {
    const input = inputRef.value
    if (!input) return
    pending = true
    settled = false
    window.addEventListener('focus', handleWindowFocus)
    if (focusTimer) window.clearTimeout(focusTimer)
    input.value = '' // 允许再次选择同一文件
    input.click()
  }

  const handleChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return // value 已被清空且未选择文件，交给取消提示处理
    if (settled) return
    settled = true
    if (focusTimer) window.clearTimeout(focusTimer)
    cleanup()
    try {
      await onPick?.(file)
    } finally {
      if (inputRef.value) inputRef.value.value = ''
    }
  }

  // 较新的 Chromium 浏览器支持 cancel 事件，提示更准确
  const handleCancel = () => {
    if (!pending || settled) return
    settled = true
    if (focusTimer) window.clearTimeout(focusTimer)
    ElMessage.info('已取消选择，图片保持不变')
    cleanup()
  }

  onBeforeUnmount(() => {
    pending = false
    if (focusTimer) window.clearTimeout(focusTimer)
    window.removeEventListener('focus', handleWindowFocus)
  })

  return {
    inputRef,
    triggerPick,
    inputEvents: {
      change: handleChange,
      cancel: handleCancel
    }
  }
}
