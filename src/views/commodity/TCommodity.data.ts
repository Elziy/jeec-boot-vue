import {BasicColumn} from '/@/components/Table';
import {FormSchema} from '/@/components/Table';
// import {rules} from '/@/utils/helper/validator';
import {render} from '/@/utils/common/renderUtils';
//列表数据
export const columns: BasicColumn[] = [
  {
    title: '商品编号',
    align: "center",
    dataIndex: 'id'
  },
  {
    title: '商品名称',
    align: "center",
    dataIndex: 'name'
  },
  {
    title: '状态',
    align: "center",
    dataIndex: 'status',
    customRender: (text) => {
      return render.renderTag(text.text, text.text === '上架' ? 'green' : 'red')
    }
  },
  {
    title: '图片',
    align: "center",
    dataIndex: 'picPath',
    customRender: render.renderImage,
  },
  {
    title: '价格',
    align: "center",
    sorter: true,
    dataIndex: 'price'
  },
];
//查询数据
export const searchFormSchema: FormSchema[] = [
  {
    label: "商品名称",
    field: 'name',
    component: 'Input',
    colProps: {span: 6},
  },
  {
    label: "状态",
    field: 'status',
    component: 'JDictSelectTag',
    componentProps: {
      dictCode: "CommodityStatus",
    },
    colProps: {span: 6},
  },
  {
    label: "价格",
    field: "priceRange",
    component: 'JRangeNumber',
    colProps: {span: 6},
  },
];
//表单数据
export const formSchema: FormSchema[] = [
  {
    label: '商品名称',
    field: 'name',
    component: 'Input',
    dynamicRules: ({model, schema}) => {
      return [
        {required: true, message: '请输入商品名称!'},
      ];
    },
  },
  {
    label: '状态',
    field: 'status',
    component: 'JDictSelectTag',
    componentProps: {
      dictCode: "CommodityStatus",
    },
    dynamicRules: ({model, schema}) => {
      return [
        {required: true, message: '请输入状态!'},
      ];
    },
  },
  {
    label: '图片',
    field: 'picPath',
    component: 'JImageUpload',
    componentProps: {},
  },
  {
    label: '价格',
    field: 'price',
    component: 'InputNumber',
    dynamicRules: ({model, schema}) => {
      return [
        {required: true, message: '请输入价格!'},
      ];
    },
  },
  // TODO 主键隐藏字段，目前写死为ID
  {
    label: '',
    field: 'id',
    component: 'Input',
    show: false
  },
];


/**
 * 流程表单调用这个方法获取formSchema
 * @param param
 */
export function getBpmFormSchema(_formData): FormSchema[] {
  // 默认和原始表单保持一致 如果流程中配置了权限数据，这里需要单独处理formSchema
  return formSchema;
}
