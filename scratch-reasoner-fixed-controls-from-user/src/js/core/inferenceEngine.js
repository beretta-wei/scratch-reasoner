export function computeStats(state) {
  const { cells } = state;
  return {
    revealedCount: cells.filter(c => c.revealed).length,
    totalCells: cells.length,
    heatmap: [],
    nextRecommendation: null
  };
}
