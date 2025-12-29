
import { GoogleGenAI, Type } from "@google/genai";
import { Task, MoldTrial } from "../types";

// 始終依照規範使用 process.env.API_KEY 初始化
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 使用 gemini-3-pro-preview 處理複雜的生產數據分析，識別技術瓶頸
export const getAIInsights = async (tasks: Task[]) => {
  const prompt = `請分析以下「模具開發專案 (Mold Development)」的加工工序數據，並以「專業繁體中文」提供以下深度洞察：
  1. 加工瓶頸診斷：識別哪一項模具工序造成了生產線停滯。
  2. 交期延遲風險：針對已超期或進度緩慢的模具進行風險評估。
  3. 機台與人力建議：針對負責人與加工進度，給予資源重分配建議。
  4. 生產線健康度總結：評估目前模具開發專案整體的進度狀態與品質穩定度。

  工序數據：
  ${JSON.stringify(tasks)}

  請回傳 JSON 格式對象。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
            atRisk: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            healthSummary: { type: Type.STRING }
          },
          required: ["bottlenecks", "atRisk", "suggestions", "healthSummary"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 回傳內容為空");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return null;
  }
};

// 使用 gemini-3-pro-preview 提供專業試模缺陷技術建議
export const getTrialImprovementAI = async (moldName: string, trial: MoldTrial) => {
  const prompt = `作為模具射出成型專家，請針對以下模具的試模狀況提供專業的改善建議：
  模具名稱：${moldName}
  試模版本：${trial.version}
  試模狀況描述：${trial.condition}

  請針對描述中的成型缺陷（如：毛邊、縮水、流痕、走膠不均、尺寸偏差等）提供技術性的對策建議。
  建議字數約 120 字左右，口吻專業且精確。請勿回覆 JSON，直接回覆純文字。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    });

    const text = response.text;
    if (!text || text.trim() === "") {
      return "目前無法從 AI 獲取具體對策，建議檢查試模紀錄描述是否過於簡略。";
    }
    return text.trim();
  } catch (error: any) {
    console.error("Gemini Trial Advice Error:", error);
    // 拋出具體錯誤以便前端 UI 處理 Loading 狀態
    throw new Error(error.message || "AI 服務暫時無回應");
  }
};
