import { LMStudioClient } from "@lmstudio/sdk";
import fs from "fs/promises";
import path from "path";

// --- 設定 ---
const CONFIG = {
    lmstudio: {
        host: '192.168.xx.xx', // 環境に合わせて変更してください
        port: xxxx,           // ポート番号を変更してください
        model: 'google/gemma-4-e4b',
        maxTokens: 131000,
    },
    outputDir: './evaluation_results'
};

// 仕様書に基づく分析視点 (Analysis Lenses)
const ANALYSIS_LENSES = {
    P_World: { name: "世界構造の批評", prompt: "このSF設定は、単なる装飾か、物語を成立させる必須の法則なのか？SFとしての説得力を判定してください。" },
    P_Tempo: { name: "読者の心理的体験分析", prompt: "時間経過と情報提示のカーブを評価し、物語のリズム感とエンターテインメントとしての完成度を判定してください。" },
    P_Them:  { name: "普遍性の探究", prompt: "SF的なギミックを除いた、人間の根源的な感情・倫理観という切り口で、テーマの深さを測定してください。" },
    P_Form:  { name: "形式選択の批評", prompt: "採用されている形式が、主題を伝えるための最も洗練された手段であるか否かを判定してください。" }
};

async function main() {
    const inputDir = process.argv[2];
    if (!inputDir) {
        console.error("使用法: node sf_evaluator.mjs <作品フォルダのパス>");
        process.exit(1);
    }

    // LMStudioクライアント初期化 [1]
    const client = new LMStudioClient({
        baseUrl: `ws://${CONFIG.lmstudio.host}:${CONFIG.lmstudio.port}`
    });
    const model = await client.llm.model(CONFIG.lmstudio.model);

    try {
        // 1. File I/O Manager: ファイルの読み込み
        console.log("--- フェーズ 1: ファイルのロード ---");
        const files = (await fs.readdir(inputDir)).filter(f => f.endsWith('.txt'));
        const works = [];

        for (const file of files) {
            const content = await fs.readFile(path.join(inputDir, file), 'utf-8');
            works.push({ title: file, content: content });
        }
        console.log(`${works.length} 件の作品を読み込みました。`);

        // 2. Analysis Loop: 各作品の分析
        console.log("\n--- フェーズ 2: 個別作品の分析ループ ---");
        const allAnalysisReports = [];
        await fs.mkdir(CONFIG.outputDir, { recursive: true });

        for (const work of works) {
            console.log(`分析中: ${work.title}...`);
            
            // Context Pre-Processor: 簡易的なチャンク分割（仕様書に基づき論理的分割を想定）
            // 実際にはトークン数で制御しますが、ここでは簡易的に分割します
            const chunks = [work.content]; // 実際の実装ではここで意味的な分割を行う

            const workAnalysis = {
                title: work.title,
                details: {}
            };

            for (const [id, lens] of Object.entries(ANALYSIS_LENSES)) {
                const prompt = `作品名: ${work.title}\n視点: ${lens.name}\n指示: ${lens.prompt}\n出力は1000文字以内で行うこと。\n\n本文:\n${chunks[0]}`;
                const result = await model.respond(prompt);
                workAnalysis.details[id] = result.nonReasoningContent || result.content; // [1]

		console.log(`初回トークン時間 (TTFT): ${result.stats.timeToFirstTokenSec} 秒, トークン生成速度: ${result.stats.tokensPerSecond}tokens/sec, 終了理由: ${result.stats.stopReason}, 総所要時間: ${result.stats.totalTimeSec} 秒\n`);

            }

            allAnalysisReports.push(workAnalysis);
            
            // Output Manager: 個別結果を保存
            await fs.writeFile(
                path.join(CONFIG.outputDir, `${work.title}_analysis.json`), 
                JSON.stringify(workAnalysis, null, 2)
            );
        }

        // 3. Synthesis Engine: 比較とランキング
        console.log("\n--- フェーズ 3: 比較、評価、ランキング ---");
        const synthesisPrompt = `
以下の全作品の分析レポートを元に、共通の評価軸（世界観、リズム、テーマ、形式）で相対評価を行い、最終的なランキング報告書を作成してください。
客観的なスコアリングと、順位の根拠となるクロス比較表を含めてください。

${JSON.stringify(allAnalysisReports, null, 2)}
        `;

        const finalReportResult = await model.respond(synthesisPrompt);
        const finalReport = finalReportResult.nonReasoningContent || finalReportResult.content;

        await fs.writeFile(path.join(CONFIG.outputDir, 'final_rank_report.md'), finalReport);
        console.log("\n選考が完了しました。結果は " + CONFIG.outputDir + " を確認してください。");
        console.log("\n--- 最終レポート抜粋 ---\n", finalReport);

    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
}

main();