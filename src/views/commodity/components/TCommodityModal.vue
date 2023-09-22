<template>
  <BasicDrawer v-bind="$attrs" @register="register" showFooter destroy-on-close
               :title="title"
               @ok="handleSubmit"
               width="50%">
    <div>
      <BasicForm @register="registerForm"/>
    </div>
  </BasicDrawer>
</template>

<script lang="ts" setup>
import {ref, computed, unref} from 'vue';
import {BasicForm, useForm} from '/@/components/Form/index';
import {formSchema} from '../TCommodity.data';
import {saveOrUpdate} from '../TCommodity.api';
import {BasicDrawer, useDrawerInner} from "@/components/Drawer";
// Emits声明
const emit = defineEmits(['register', 'success']);
const isUpdate = ref(true);
//表单配置
const [registerForm, {setProps, resetFields, setFieldsValue, validate}] = useForm({
  schemas: formSchema,
  showActionButtonGroup: false,
  baseColProps: {span: 24}
});

const [register, {setDrawerProps, closeDrawer}] = useDrawerInner(async (data) => {
  //重置表单
  await resetFields();
  setDrawerProps({
    confirmLoading: false,
    showCancelBtn: !!data?.showFooter,
    showOkBtn: !!data?.showFooter
  });
  isUpdate.value = !!data?.isUpdate;
  if (unref(isUpdate)) {
    //表单赋值
    await setFieldsValue({
      ...data.record,
    });
  }
  // 隐藏底部时禁用整个表单
  setProps({disabled: !data?.showFooter})
});

//设置标题
const title = computed(() => (!unref(isUpdate) ? '新增' : '编辑'));

//表单提交事件
async function handleSubmit(v) {
  try {
    let values = await validate();
    setDrawerProps({confirmLoading: true});
    //提交表单
    await saveOrUpdate(values, isUpdate.value);
    //关闭弹窗
    closeDrawer();
    //刷新列表
    emit('success');
  } finally {
    setDrawerProps({confirmLoading: false});
  }
}
</script>

<style lang="less" scoped>
/** 时间和数字输入框样式 */
:deep(.ant-input-number) {
  width: 100%
}

:deep(.ant-calendar-picker) {
  width: 100%
}
</style>
