# Persona Overlay for SillyTavern

每個聊天各自保存 Persona 補充設定，並跟隨 SillyTavern 原生 Persona 的注入位置。

## 入口

- 聊天輸入欄旁的魔法棒／Extensions Menu → **Persona Overlay**
- 右下角懸浮快速按鈕
- Extensions Settings → **Persona Overlay**

三個入口共用 `chatMetadata.persona_overlay`，Quick Panel 永遠只有一個 DOM instance。

## 安裝

將整個資料夾安裝到 SillyTavern 的第三方擴充目錄，或以 Git URL 從 SillyTavern 的 Extensions 管理頁安裝。重新載入後，在任意聊天的魔法棒選單中選擇 **Persona Overlay**。

## 資料與注入

- 聊天資料：`chatMetadata.persona_overlay`
- 全域模板：`extensionSettings.persona_overlay.templates`
- Prompt key：`PERSONA_OVERLAY`
- Persona 設為 At Depth 時，Overlay 跟隨其 Depth 與 Role。
- Persona 設為 Top/Bottom Author's Note 時，Overlay 跟隨目前聊天的 Author's Note placement。
- Persona 注入設為 None 時，Overlay 也不注入。

## 開發

```bash
npm test
```
