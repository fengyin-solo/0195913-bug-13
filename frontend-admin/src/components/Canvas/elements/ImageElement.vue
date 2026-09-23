<template>
  <div class="image-element" @drop="handleDrop" @dragover.prevent>
    <img v-if="element.imageData" :src="element.imageData" :alt="element.imageName || '图片'" @error="handleImgError" />

    <!-- 加载中：慢加载 / 大图解码时给出明确反馈 -->
    <div v-if="loading" class="image-mask">
      <el-icon class="is-loading" :size="22"><Loading /></el-icon>
      <span>图片加载中…</span>
    </div>

    <!-- 加载失败 / 未加载完整：明确告知用户，可点击重试 -->
    <div v-else-if="loadError" class="image-mask image-error" @click="triggerPick">
      <el-icon :size="22"><PictureFilled /></el-icon>
      <span class="error-text">{{ loadError }}</span>
      <span class="retry-text">点击重新选择</span>
    </div>

    <!-- 未设置图片（兼容旧数据 / 手动清空的情况） -->
    <div v-else-if="!element.imageData" class="placeholder" @click="triggerPick">
      <el-icon :size="24"><Picture /></el-icon>
      <span>点击添加</span>
    </div>

    <input ref="inputRef" type="file" accept="image/*" v-on="inputEvents" style="display: none" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvas'
import { ElMessage } from 'element-plus'
import { resolveImageFile, ImageFileError } from '@/utils/image'
import { useImagePicker } from '@/composables/useImagePicker'

const props = defineProps({ element: { type: Object, required: true } })
const store = useCanvasStore()

const loading = ref(false)
const loadError = ref('')

// 图片数据切换后重置失败标记（新数据是否有效由 <img> onerror 兜底）
watch(() => props.element.imageData, () => { loadError.value = '' })

const handleImgError = () => {
  if (!props.element.imageData) return
  loadError.value = '图片加载失败或格式不支持'
}

const applyFile = async (file) => {
  loading.value = true
  try {
    const result = await resolveImageFile(file, props.element)
    if (result.same) {
      ElMessage.info(`「${result.name}」与当前图片是同一张文件，未做更换`)
      return
    }
    store.updateElement(props.element.id, {
      imageData: result.dataUrl,
      imageName: result.name,
      imageSize: result.size,
      imageWidth: result.width,
      imageHeight: result.height
    })
    loadError.value = ''
    ElMessage.success(`图片「${result.name}」已加载`)
  } catch (err) {
    if (err instanceof ImageFileError) {
      loadError.value = err.message
      ElMessage.error(err.message)
    } else {
      loadError.value = '图片加载失败，请重试'
      ElMessage.error('图片加载失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

const { inputRef, triggerPick, inputEvents } = useImagePicker({ onPick: applyFile })

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  applyFile(file)
}
</script>

<style scoped>
.image-element { width: 100%; height: 100%; overflow: hidden; background: #f5f7fa; border-radius: 2px; position: relative; }
.image-element img { width: 100%; height: 100%; object-fit: contain; display: block; }
.placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #909399;
  gap: 4px; font-size: 11px; cursor: pointer; border: 1px dashed #dcdfe6;
}
.placeholder:hover { border-color: #409eff; color: #409eff; }
.image-mask {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px; padding: 6px;
  background: rgba(245, 247, 250, 0.92); color: #909399;
  font-size: 11px; text-align: center;
}
.image-error { color: #f56c6c; cursor: pointer; }
.image-error .error-text { line-height: 1.4; word-break: break-all; }
.image-error .retry-text { color: #409eff; margin-top: 2px; }
</style>
