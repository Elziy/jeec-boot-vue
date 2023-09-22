<template>
  <BasicTable @register="registerTable" :rowSelection="rowSelection">
    <template #tableTitle>
      <a-button type="primary" @click="handleAdd" preIcon="ant-design:plus-outlined"> 新增
      </a-button>
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <template #overlay>
          <a-menu>
            <a-menu-item key="1" @click="batchHandleDelete">
              <Icon icon="ant-design:delete-outlined"></Icon>
              删除
            </a-menu-item>
          </a-menu>
        </template>
        <a-button>批量操作
          <Icon icon="mdi:chevron-down"></Icon>
        </a-button>
      </a-dropdown>
    </template>
    <template #action="{ record }">
      <TableAction :actions="getTableAction(record)" :dropDownActions="getDropDownAction(record)"/>
    </template>
  </BasicTable>
  <!-- 表单区域 -->
  <TCommodityModal @register="registerModal" @success="handleSuccess"></TCommodityModal>
</template>

<script setup lang="ts">

import {
    batchDelete,
    deleteOne,
    getExportUrl,
    getImportUrl, list,
    list as getListApi
} from "@/views/commodity/TCommodity.api";
import {columns, columns as getColums, searchFormSchema} from "@/views/commodity/TCommodity.data";
import {TableAction, useTable} from "@/components/Table";
import BasicTable from "@/components/Table/src/BasicTable.vue";
import {useModal} from "@/components/Modal";
import {useListPage} from "@/hooks/system/useListPage";
import TCommodityModal from "@/views/commodity/components/TCommodityModal.vue";
import JUploadButton from "@/components/Button/src/JUploadButton.vue";
import {ref} from "@vue/runtime-core";
import {useDrawer} from "@/components/Drawer";

const [registerModal, {openDrawer}] = useDrawer();

// const [registerTable, {reload}] = useTable({
//     title: '商品信息',
//     api: getListApi,
//     columns: getColums,
//     formConfig: {
//         schemas: searchFormSchema,
//         autoSubmitOnEnter: true,
//         showAdvancedButton: true,
//         fieldMapToNumber: [],
//         fieldMapToTime: [],
//     },
//     useSearchForm: true,
//     showTableSetting: true,
//     tableSetting: {
//         fullScreen: true
//     },
//     showIndexColumn: true,
//     rowKey: 'id'
// })

const {prefixCls, tableContext, onExportXls, onImportXls} = useListPage({
    tableProps: {
        title: '商品信息',
        api: list,
        columns,
        canResize: false,
        formConfig: {
            //labelWidth: 120,
            schemas: searchFormSchema,
            autoSubmitOnEnter: true,
            showAdvancedButton: true,
            fieldMapToNumber: [],
            fieldMapToTime: [],
        },
        actionColumn: {
            width: 120,
            fixed: 'right'
        },
    },
    exportConfig: {
        name: "商品信息",
        url: getExportUrl,
    },
    importConfig: {
        url: getImportUrl,
        success: handleSuccess
    },
})

const [registerTable, {reload}, {rowSelection, selectedRowKeys}] = tableContext


/**
 * 新增事件
 */
function handleAdd() {
    openDrawer(true, {
        isUpdate: false,
        showFooter: true,
    });
}

/**
 * 编辑事件
 */
function handleEdit(record: Recordable) {
    openDrawer(true, {
        record,
        isUpdate: true,
        showFooter: true,
    });
}

/**
 * 详情
 */
function handleDetail(record: Recordable) {
    openDrawer(true, {
        record,
        isUpdate: true,
        showFooter: false,
    });
}

/**
 * 删除事件
 */
async function handleDelete(record) {
    await deleteOne({id: record.id}, handleSuccess);
}

/**
 * 批量删除事件
 */
async function batchHandleDelete() {
    await batchDelete({ids: selectedRowKeys.value}, handleSuccess);
}


/**
 * 成功回调
 */
function handleSuccess() {
    (selectedRowKeys.value = []) && reload();
}

/**
 * 操作栏
 */
function getTableAction(record) {
    return [
        {
            label: '编辑',
            onClick: handleEdit.bind(null, record),
        }
    ]
}

/**
 * 下拉操作栏
 */
function getDropDownAction(record) {
    return [
        {
            label: '详情',
            onClick: handleDetail.bind(null, record),
        }, {
            label: '删除',
            popConfirm: {
                title: '是否确认删除',
                confirm: handleDelete.bind(null, record),
            }
        }
    ]
}
</script>

<style scoped lang="less">

</style>
