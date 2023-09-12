import type { BasicColumn } from '/@/components/Table';
import type { Ref, ComputedRef } from 'vue';
import type { BasicTableProps, PaginationProps, TableRowSelection } from '/@/components/Table';
import { computed, nextTick, onUnmounted, ref, toRaw, unref, watch, watchEffect } from 'vue';
import { omit } from 'lodash-es';
import { throttle } from 'lodash-es';
import { Checkbox, Radio } from 'ant-design-vue';
import { isFunction } from '/@/utils/is';
import { findNodeAll } from '/@/utils/helper/treeHelper';
import { ROW_KEY } from '/@/components/Table/src/const';
import { onMountedOrActivated } from '/@/hooks/core/onMountedOrActivated';
import { useMessage } from '/@/hooks/web/useMessage';
import { ModalFunc } from 'ant-design-vue/lib/modal/Modal';

// 自定义选择列的key
export const CUS_SEL_COLUMN_KEY = 'j-custom-selected-column';

/**
 * 自定义选择列
 */
export function useCustomSelection(
  propsRef: ComputedRef<BasicTableProps>,
  emit: EmitType,
  wrapRef: Ref<null | HTMLDivElement>,
  getPaginationRef: ComputedRef<boolean | PaginationProps>,
  tableData: Ref<Recordable[]>,
  childrenColumnName: ComputedRef<string>
) {
  const { createConfirm } = useMessage();
  // 表格body元素
  const bodyEl = ref<HTMLDivElement>();
  // body元素高度
  const bodyHeight = ref<number>(0);
  // 表格tr高度
  const rowHeight = ref<number>(0);
  // body 滚动高度
  const scrollTop = ref(0);
  // 选择的key
  const selectedKeys = ref<string[]>([]);
  // 选择的行
  const selectedRows = ref<Recordable[]>([]);

  // 扁平化数据，children数据也会放到一起
  const flattedData = computed(() => {
    return flattenData(tableData.value, childrenColumnName.value);
  });

  const getRowSelectionRef = computed((): TableRowSelection | null => {
    const { rowSelection } = unref(propsRef);
    if (!rowSelection) {
      return null;
    }

    return {
      preserveSelectedRowKeys: true,
      // selectedRowKeys: unref(selectedKeys),
      // onChange: (selectedRowKeys: string[]) => {
      //   setSelectedRowKeys(selectedRowKeys);
      // },
      ...omit(rowSelection, ['onChange', 'selectedRowKeys']),
    };
  });

  // 是否是单选
  const isRadio = computed(() => {
    return getRowSelectionRef.value?.type === 'radio';
  });

  const getAutoCreateKey = computed(() => {
    return unref(propsRef).autoCreateKey && !unref(propsRef).rowKey;
  });

  // 列key字段
  const getRowKey = computed(() => {
    const { rowKey } = unref(propsRef);
    return unref(getAutoCreateKey) ? ROW_KEY : rowKey;
  });
  // 获取行的key字段数据
  const getRecordKey = (record) => {
    if (!getRowKey.value) {
      return record[ROW_KEY];
    } else if (isFunction(getRowKey.value)) {
      return getRowKey.value(record);
    } else {
      return record[getRowKey.value];
    }
  };

  // 分页配置
  const getPagination = computed<PaginationProps>(() => {
    return typeof getPaginationRef.value === 'boolean' ? {} : getPaginationRef.value;
  });
  // 当前页条目数量
  const currentPageSize = computed(() => {
    const { pageSize = 10, total = flattedData.value.length } = getPagination.value;
    return pageSize > total ? total : pageSize;
  });

  // 选择列表头props
  const selectHeaderProps = computed(() => {
    return {
      onSelectAll,
      isRadio: isRadio.value,
      selectedLength: flattedData.value.filter((data) => selectedKeys.value.includes(getRecordKey(data))).length,
      pageSize: currentPageSize.value,
    };
  });

  // 监听传入的selectedRowKeys
  watch(
    () => unref(propsRef)?.rowSelection?.selectedRowKeys,
    (val: string[]) => {
      if (Array.isArray(val)) {
        setSelectedRowKeys(val);
      }
    },
    { immediate: true }
  );

  // 当任意一个变化时，触发同步检测
  watch([selectedKeys, selectedRows], () => {
    nextTick(() => {
      syncSelectedRows();
    });
  });

  // 监听滚动条事件
  const onScrollTopChange = throttle((e) => (scrollTop.value = e?.target?.scrollTop), 150);

  let bodyResizeObserver: Nullable<ResizeObserver> = null;
  // 获取首行行高
  watchEffect(() => {
    if (bodyEl.value) {
      // 监听div高度变化
      bodyResizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target === bodyEl.value && entry.contentRect) {
            const { height } = entry.contentRect;
            bodyHeight.value = Math.ceil(height);
          }
        }
      });
      bodyResizeObserver.observe(bodyEl.value);
      const el = bodyEl.value?.querySelector('tbody.ant-table-tbody tr.ant-table-row') as HTMLDivElement;
      if (el) {
        rowHeight.value = el.offsetHeight;
        return;
      }
    }
    rowHeight.value = 50;
    // 这种写法是为了监听到 size 的变化
    propsRef.value.size && void 0;
  });

  onMountedOrActivated(async () => {
    bodyEl.value = await getTableBody(wrapRef.value!);
    bodyEl.value.addEventListener('scroll', onScrollTopChange);
  });
  onUnmounted(() => {
    if (bodyEl.value) {
      bodyEl.value?.removeEventListener('scroll', onScrollTopChange);
    }
    if (bodyResizeObserver != null) {
      bodyResizeObserver.disconnect();
    }
  });

  // 选择全部
  function onSelectAll(checked: boolean) {
    // 取消全选
    if (!checked) {
      selectedKeys.value = [];
      selectedRows.value = [];
      emitChange();
      return;
    }
    let modal: Nullable<ReturnType<ModalFunc>> = null;
    // 全选
    const checkAll = () => {
      if (modal != null) {
        modal.update({
          content: '正在分批全选，请稍后……',
          cancelButtonProps: { disabled: true },
        });
      }
      let showCount = 0;
      // 最小选中数量
      let minSelect = 100;
      const hidden: Recordable[] = [];
      flattedData.value.forEach((item, index, array) => {
        if (array.length > 120) {
          if (showCount <= minSelect && recordIsShow(index, Math.max((minSelect - 10) / 2, 3))) {
            showCount++;
            updateSelected(item, checked);
          } else {
            hidden.push(item);
          }
        } else {
          updateSelected(item, checked);
        }
      });
      if (hidden.length > 0) {
        return batchesSelectAll(hidden, checked, minSelect);
      } else {
        emitChange();
      }
    };

    // 当数据量大于120条时，全选会导致页面卡顿，需进行慢速全选
    if (flattedData.value.length > 120) {
      modal = createConfirm({
        title: '全选',
        content: '当前数据量较大，全选可能会导致页面卡顿，确定要执行此操作吗？',
        iconType: 'warning',
        onOk: () => checkAll(),
      });
    } else {
      checkAll();
    }
  }

  // 分批全选
  function batchesSelectAll(hidden: Recordable[], checked: boolean, minSelect: number) {
    return new Promise<void>((resolve) => {
      (function call() {
        // 每隔半秒钟，选择100条数据
        setTimeout(() => {
          const list = hidden.splice(0, minSelect);
          if (list.length > 0) {
            list.forEach((item) => {
              updateSelected(item, checked);
            });
            call();
          } else {
            setTimeout(() => {
              emitChange();
              // update-begin--author:liaozhiyang---date:20230811---for：【QQYUN-5687】批量选择，提示成功后，又来一个提示
              setTimeout(() =>resolve(), 0);
              // update-end--author:liaozhiyang---date:20230811---for：【QQYUN-5687】批量选择，提示成功后，又来一个提示
            }, 500);
          }
        }, 300);
      })();
    });
  }

  // 选中单个
  function onSelect(record, checked) {
    updateSelected(record, checked);
    emitChange();
  }

  function updateSelected(record, checked) {
    const recordKey = getRecordKey(record);
    if (isRadio.value) {
      selectedKeys.value = [recordKey];
      selectedRows.value = [record];
      return;
    }
    const index = selectedKeys.value.findIndex((key) => key === recordKey);
    if (checked) {
      if (index === -1) {
        selectedKeys.value.push(recordKey);
        selectedRows.value.push(record);
      }
    } else {
      if (index !== -1) {
        selectedKeys.value.splice(index, 1);
        selectedRows.value.splice(index, 1);
      }
    }
  }

  // 调用用户自定义的onChange事件
  function emitChange() {
    const { rowSelection } = unref(propsRef);
    if (rowSelection) {
      const { onChange } = rowSelection;
      if (onChange && isFunction(onChange)) {
        setTimeout(() => {
          onChange(selectedKeys.value, selectedRows.value);
        }, 0);
      }
    }
    emit('selection-change', {
      keys: getSelectRowKeys(),
      rows: getSelectRows(),
    });
  }

  // 用于判断是否是自定义选择列
  function isCustomSelection(column: BasicColumn) {
    return column.key === CUS_SEL_COLUMN_KEY;
  }

  /**
   * 判断当前行是否可视，虚拟滚动用
   * @param index 行下标
   * @param threshold 前后阈值，默认可视区域前后显示3条
   */
  function recordIsShow(index: number, threshold = 3) {
    // 只有数据量大于50条时，才会进行虚拟滚动
    const isVirtual = flattedData.value.length > 50;
    if (isVirtual) {
      // 根据 scrollTop、bodyHeight、rowHeight 计算出当前行是否可视（阈值前后3条）
      // flag1 = 判断当前行是否在可视区域上方3条
      const flag1 = scrollTop.value - rowHeight.value * threshold < index * rowHeight.value;
      // flag2 = 判断当前行是否在可视区域下方3条
      const flag2 = index * rowHeight.value < scrollTop.value + bodyHeight.value + rowHeight.value * threshold;
      // 全部条件满足时，才显示当前行
      return flag1 && flag2;
    }
    return true;
  }

  // 自定义渲染Body
  function bodyCustomRender(params) {
    const { index } = params;
    if (!recordIsShow(index)) {
      return '';
    }
    if (isRadio.value) {
      return renderRadioComponent(params);
    } else {
      return renderCheckboxComponent(params);
    }
  }

  /**
   * 渲染checkbox组件
   */
  function renderCheckboxComponent({ record }) {
    const recordKey = getRecordKey(record);
    // 获取用户自定义checkboxProps
    const checkboxProps = ((getCheckboxProps) => {
      if (typeof getCheckboxProps === 'function') {
        try {
          return getCheckboxProps(record) ?? {};
        } catch (error) {
          console.error(error);
        }
      }
      return {};
    })(propsRef.value.rowSelection?.getCheckboxProps);
    return (
      <Checkbox
        {...checkboxProps}
        key={'j-select__' + recordKey}
        checked={selectedKeys.value.includes(recordKey)}
        onUpdate:checked={(checked) => onSelect(record, checked)}
      />
    );
  }

  /**
   * 渲染radio组件
   */
  function renderRadioComponent({ record }) {
    const recordKey = getRecordKey(record);
    return (
      <Radio
        key={'j-select__' + recordKey}
        checked={selectedKeys.value.includes(recordKey)}
        onUpdate:checked={(checked) => onSelect(record, checked)}
      />
    );
  }

  // 创建选择列
  function handleCustomSelectColumn(columns: BasicColumn[]) {
    if (!propsRef.value.rowSelection) {
      return;
    }
    const isFixedLeft = columns.some((item) => item.fixed === 'left');

    columns.unshift({
      title: '选择列',
      flag: 'CHECKBOX',
      key: CUS_SEL_COLUMN_KEY,
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      align: 'center',
      ...(isFixedLeft ? { fixed: 'left' } : {}),
      customRender: bodyCustomRender,
    });
  }

  // 清空所有选择
  function clearSelectedRowKeys() {
    onSelectAll(false);
  }

  // 通过 selectedKeys 同步 selectedRows
  function syncSelectedRows() {
    if (selectedKeys.value.length !== selectedRows.value.length) {
      setSelectedRowKeys(selectedKeys.value);
    }
  }

  // 设置选择的key
  function setSelectedRowKeys(rowKeys: string[]) {
    selectedKeys.value = rowKeys;
    const allSelectedRows = findNodeAll(
      toRaw(unref(flattedData)).concat(toRaw(unref(selectedRows))),
      (item) => rowKeys.includes(getRecordKey(item)),
      {
        children: propsRef.value.childrenColumnName ?? 'children',
      }
    );
    const trueSelectedRows: any[] = [];
    rowKeys.forEach((key: string) => {
      const found = allSelectedRows.find((item) => getRecordKey(item) === key);
      found && trueSelectedRows.push(found);
    });
    // update-begin--author:liaozhiyang---date:20230823---for：【QQYUN-6283】点击表格清空，rowSelect里面的selectedRowKeys没置空。
    // update-begin--author:liaozhiyang---date:20230811---for：【issues/657】浏览器卡死问题
    if (trueSelectedRows.length || !rowKeys.length) {
      selectedRows.value = trueSelectedRows;
      emitChange();
    }
    // update-end--author:liaozhiyang---date:20230811---for：【issues/657】】浏览器卡死问题
    // update-end--author:liaozhiyang---date:20230823---for：【QQYUN-6283】点击表格清空，rowSelect里面的selectedRowKeys没置空。
  }

  function getSelectRows<T = Recordable>() {
    return unref(selectedRows) as T[];
  }

  function getSelectRowKeys() {
    return unref(selectedKeys);
  }

  function getRowSelection() {
    return unref(getRowSelectionRef)!;
  }

  function deleteSelectRowByKey(key: string) {
    const index = selectedKeys.value.findIndex((item) => item === key);
    if (index !== -1) {
      selectedKeys.value.splice(index, 1);
      selectedRows.value.splice(index, 1);
    }
  }

  // 【QQYUN-5837】动态计算 expandIconColumnIndex
  const getExpandIconColumnIndex = computed(() => {
    const { expandIconColumnIndex } = unref(propsRef);
    // 未设置选择列，则保持不变
    if (getRowSelectionRef.value == null) {
      return expandIconColumnIndex;
    }
    // 设置了选择列，并且未传入 index 参数，则返回 1
    if (expandIconColumnIndex == null) {
      return 1;
    }
    return expandIconColumnIndex;
  });

  return {
    getRowSelection,
    getRowSelectionRef,
    getSelectRows,
    getSelectRowKeys,
    setSelectedRowKeys,
    deleteSelectRowByKey,
    selectHeaderProps,
    isCustomSelection,
    handleCustomSelectColumn,
    clearSelectedRowKeys,
    getExpandIconColumnIndex,
  };
}

function getTableBody(wrap: HTMLDivElement) {
  return new Promise<HTMLDivElement>((resolve) => {
    (function fn() {
      const bodyEl = wrap.querySelector('.ant-table-wrapper .ant-table-body') as HTMLDivElement;
      if (bodyEl) {
        resolve(bodyEl);
      } else {
        setTimeout(fn, 100);
      }
    })();
  });
}

function flattenData<RecordType>(data: RecordType[] | undefined, childrenColumnName: string): RecordType[] {
  let list: RecordType[] = [];
  (data || []).forEach((record) => {
    list.push(record);

    if (record && typeof record === 'object' && childrenColumnName in record) {
      list = [...list, ...flattenData<RecordType>((record as any)[childrenColumnName], childrenColumnName)];
    }
  });

  return list;
}
