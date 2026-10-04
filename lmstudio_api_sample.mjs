// LMStudio SDKを使用したサンプルコード

// モジュールの読み込み方法
import { LMStudioClient } from "@lmstudio/sdk";

// LMStudioの設定で必要になる項目
// 通常は利用中にモデルを入れ替えないため、固定で設定してしまってよい
const CONFIG = {
    lmstudio: {
        host: '192.168.xx.xx',
        port: xxxx,
        model: 'google/gemma-4-e4b',
        maxTokens: 131000,
    }
};

// LMStudioClientの初期化
const client = new LMStudioClient({
  baseUrl: "ws://" + CONFIG.lmstudio.host + ":" + CONFIG.lmstudio.port
});
const model = await client.llm.model(CONFIG.lmstudio.model);

// トークン数のカウント
const tokenCount_target = "あなたの名前とできることを簡単に紹介してください。";
const tokenCount = await model.countTokens(tokenCount_target);
console.log(tokenCount_target + " のトークン数は " + tokenCount);

// 推論の実行
const result = await model.respond("あなたのモデル名を教えてください。");
// 推論の途中経過が出力されるモデルの場合には、contentには推論の途中経過が含まれてしまう。
// nonReasoningContentを使うことで、推論の途中経過を含まない最終的な推論結果のみを取得することができる。
console.log(result.nonReasoningContent || result.content);

// 推論を一定時間でタイムアウト処理させる例
console.log("★★★★★　タイムアウト処理の例を実行します　★★★★★");
const controller = new AbortController();
const TIMEOUT_MS = 1000; // 例: 1秒

// 一定時間後に推論をキャンセルするタイマー
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS); 

try {
  // ※既存の処理に応じて model.complete または model.respond を選択
  const prediction = model.respond("これはタイムアウトされる前提のプロンプトなので10秒以上かけて出力をはじめて貰う必要があります。少し時間をかけて考えて見て下さい。", {
    maxTokens: 500, // 必要に応じて既存の設定を引き継ぐ
    signal: controller.signal, // キャンセル用シグナルを渡す
  });

  const result = await prediction.result();
  
  if (result.stats.stopReason === "userStopped") {
    console.log("★★★★★　タイムアウトにより推論がキャンセルされました　★★★★★");
    // 必要に応じたタイムアウト時の戻り値・エラー送出処理
  } else {
    // 成功時の処理
    console.log("★★★★★　推論が正常に完了しました　★★★★★");
    console.log(result.nonReasoningContent || result.content);
  }
} catch (error) {
  console.error("LLM推論中にエラーが発生しました:", error);
  throw error;
} finally {
  clearTimeout(timeoutId); // メモリリーク防止のためタイマーを解除
}