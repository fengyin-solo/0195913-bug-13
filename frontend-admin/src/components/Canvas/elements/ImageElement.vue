<template>
  <div class="image-element" @drop="handleDrop" @dragover.prevent>
    <img
      v-if="element.src && !loadFailed"
      :src="element.src"
      alt="图片"
      @load="loadFailed = false"
      @error="loadFailed = true"
    />
    <div v-else class="placeholder" :class="{ error: loadFailed }" @click="triggerUpload">
      <el-icon :size="24"><Picture /></el-icon>
      <span>{{ loadFailed ? '图片加载失败，点击重新选择' : '点击添加' }}</span>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
      @cancel="notifyPickCancel"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useImagePicker } from '@/composables/useImagePicker'

const props = defineProps({ element: { type: Object, required: true } })
const fileInput = ref(null)
const loadFailed = ref(false)
const { applyImageFile, notifyPickCancel } = useImagePicker()

// 换图后重置加载状态，由新图的 load/error 事件重新判定
watch(() => props.element.src, () => { loadFailed.value = false })

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileChange = (e) => {
  const file = e.target.files[0]
  // 重置输入值，重复选择同一文件时仍能触发 change，从而给出“图片相同”的提示
  e.target.value = ''
  if (file) applyImageFile(props.element, file)
}

const handleDrop = (e) => {
  const file = e.dataTransfer.files?.[0]
  if (!file) return // 非文件拖放（如元件库拖入）交给画布处理
  e.preventDefault()
  e.stopPropagation()
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('拖入的文件不是图片，请拖入图片文件')
    return
  }
  applyImageFile(props.element, file)
}
</script>

<style scoped>
.image-element { width: 100%; height: 100%; overflow: hidden; background: #f5f7fa; border-radius: 2px; }
.image-element img { width: 100%; height: 100%; object-fit: contain; }
.placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #909399;
  gap: 4px; font-size: 11px; cursor: pointer; border: 1px dashed #dcdfe6;
  box-sizing: border-box; text-align: center; padding: 4px;
}
.placeholder:hover { border-color: #409eff; color: #409eff; }
.placeholder.error { border-color: #f56c6c; color: #f56c6c; }
</style>
