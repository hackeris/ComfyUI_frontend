/**
 * ArkWeb JS 桥类型声明(定制, 2026-09-08)
 * 图片"下载"按钮经此桥交给应用侧: 弹 DocumentViewPicker 选目标位置 → 保存
 * (注册见主项目 Index.ets: registerJavaScriptProxy(_imageSaveClient, '__ohosImageSave', ...))
 */
interface OhosImageSaveBridge {
  /** 返回 JSON 字符串 {ok:boolean, path?:string, msg?:string}; 取消/失败时 ok=false */
  pickAndSave(url: string, filename: string): Promise<string>
}

declare global {
  interface Window {
    __ohosImageSave?: OhosImageSaveBridge
  }
}

export {}
