// 必要なライブラリのインポート (Node.js環境を想定)
import * as fs from 'fs';
import * as path from 'path';

// [1] のサンプルコードから必須となるLLMクライアント構造を使用する
import { LMStudioClient } from "@lmstudio/sdk"; 

// --- グローバル設定と初期化 (Source [1]を参照) ---
const CONFIG = {
    lmstudio: {
        host: '192.168.xx.xx', // ローカルのホスト名に変更してください
        port: xxxx,           // ポート番号を変更してください
        model: 'google/gemma-4-e4b', // 使用するモデル名を指定
    }
};

const client = new LMStudioClient({
  baseUrl: "ws://" + CONFIG.lmstudio.host + ":" + CONFIG.lmstudio.port
});

/**
 * 指定ディレクトリ内の全てのテキストファイルについて、内容のトークン数を計測し出力する関数。
 * @param inputDir - 選考対象作品が格納されたフォルダのパス (コマンドラインオプション相当)。
 */
async function countFileTokens(inputDir){
    console.log(`\n===============================================`);
    console.log(`[START] 作品データ トークン数計測プロセス開始`);
    console.log(`対象ディレクトリ: ${inputDir}`);
    console.log(`使用モデル: ${CONFIG.lmstudio.model} (Source [1])`);
    console.log(`===============================================\n`);

    if (!fs.existsSync(inputDir)) {
        throw new Error(`エラー: 指定された入力ディレクトリが見つかりません: ${inputDir}`);
    }

    // フォルダ内の全てのファイルを読み込む
    const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.txt'));
    console.log(`✅ 計測対象ファイルを発見しました: ${files.length} 個`);
    
    let totalTokensCount = 0;

    const model = await client.llm.model(CONFIG.lmstudio.model);

    // ファイルごとにループ処理を行い、トークンを計測する
    for (const filename of files) {
        const fullPath = path.join(inputDir, filename);

        try {
            // 1. ファイルの読み込み
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (!content || content.trim().length === 0) {
                console.log(`[スキップ] ${filename}: 内容が空です。`);
                continue;
            }

            // 2. トークン数の計測 (Source [1]の仕組みを流用)
            console.log(`⏳ 計測中... ${filename}`);
            const tokenCount = await model.countTokens(content);
            
            // 結果の出力
            console.log(`\n✅ 完了: トークン数は ${tokenCount} トークンでした。`);
            totalTokensCount += tokenCount;

        } catch (error) {
            // ファイル読み込みまたはAPIコールが失敗した場合のエラー処理
            console.error(`\n❌ エラーにより計測できませんでした [${filename}]`, error);
        }
    }

    console.log("\n================================================");
    console.log("🌟 トークン数計測プロセスが完了しました 🌟");
    console.log(`総ファイル処理済み: ${files.length} 個`);
    console.log(`全作品の合計トークン数 (概算): ${totalTokensCount} トークン`);
    console.log("================================================");
}

// --- スクリプト実行部分 (シミュレーション) ---
async function main() {
    // コマンドライン引数の代わりとして、ダミーの入力ディレクトリパスを設定します。
    const simulatedInputDirectory = "./novel_submissions"; 
    try {
        await countFileTokens(simulatedInputDirectory);
    } catch (e) {
        console.error("\n[致命的なエラー] トークン計測プロセスを停止します。", e);
    }
}

main();