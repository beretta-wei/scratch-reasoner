/**
 * 之後這裡會實作「推理未開格可能值」、「heatmap」、「信心度」。
 * 現階段先提供一個固定介面，回傳假資料 (placeholder)，
 * 讓 UI 可以先寫好結構，不會卡住。
 */
export function computeStats(state) {
  const { cells } = state;
  const revealedCount = cells.filter(c => c.revealed).length;

  return {
    revealedCount,
    totalCells: cells.length,
    // 之後會是 {cellIndex: score} 之類的資料
    heatmap: [],
    // 之後會有真正的信心度與建議
    confidenceSummary: "尚未計算推理，僅顯示基本統計。",
    nextRecommendation: null
  };
}
