import { store } from "../core/state.js";
import { getWorldModel, pickNextCellByWorldModel, buildRankedCells } from "../core/worldModel.js";
import { getLuckyNumbersForActiveLog } from "../core/logStore.js";
import { createElement } from "../utils/dom.js";

/**
 * 世界模型 v1 的視圖：顯示先驗勝率與推薦刮點
 * root：由 statsView.js 建立的容器
 */
export function initWorldModelView(root) {
  if (!root) return () => {};

  const render = () => {
    const state = store.getState();
    const { cols, rows, cells } = state;
    root.innerHTML = "";

    const title = createElement("div", "stats-section-title", "世界模型 v1（先驗勝率）");
    root.appendChild(title);

    if (!cols || !rows || !Array.isArray(cells) || cells.length === 0) {
      const msg = createElement("div", "stats-placeholder", "尚未建立盤面，請先在上方設定列數與行數。");
      root.appendChild(msg);
      return;
    }

    const info = createElement(
      "div",
      "stats-basic-block",
      `目前盤面：${cols} × ${rows}（共 ${cells.length} 格）`
    );
    root.appendChild(info);

    const model = getWorldModel(cols, rows);
    if (!model) {
      const msg = createElement("div", "stats-placeholder", "無法建立世界模型，請確認盤面設定。");
      root.appendChild(msg);
      return;
    }

    const suggestion = pickNextCellByWorldModel(model, cells);
    


    // === 大獎 / 小獎位置推論（世界模型） ===
    const ln = getLuckyNumbersForActiveLog();
    const major = (ln && Array.isArray(ln.major)) ? ln.major : [];
    const minor = (ln && Array.isArray(ln.minor)) ? ln.minor : [];

    const majorTitle = createElement("div","stats-section-title","大獎（世界模型推論）");
    root.appendChild(majorTitle);

    if (major.length === 0) {
      root.appendChild(createElement("div","stats-placeholder","未設定大獎號碼"));
    } else {
      const tbl = createElement("table","stats-table");
      const th = createElement("tr");
      th.appendChild(createElement("th","","號碼"));
      th.appendChild(createElement("th","","預測位置"));
      th.appendChild(createElement("th","","強度"));
      tbl.appendChild(th);
      major.forEach((num) => {
        const rankedMajor = buildRankedCells(model);
        const best = rankedMajor[0];
        const tr = createElement("tr");
        tr.appendChild(createElement("td","",String(num)));
        tr.appendChild(createElement("td","",`c${best.col}*r${best.row}`));
        tr.appendChild(createElement("td","",`${(best.score*100).toFixed(1)}%`));
        tbl.appendChild(tr);
      });
      root.appendChild(tbl);
    }

    const minorTitle = createElement("div","stats-section-title","小獎（世界模型推論）");
    root.appendChild(minorTitle);
    if (minor.length === 0) {
      root.appendChild(createElement("div","stats-placeholder","未設定小獎號碼"));
    } else {
      const tbl2 = createElement("table","stats-table");
      const th2 = createElement("tr");
      th2.appendChild(createElement("th","","號碼"));
      th2.appendChild(createElement("th","","預測位置"));
      th2.appendChild(createElement("th","","強度"));
      tbl2.appendChild(th2);
      minor.forEach((num) => {
        const rankedMinor = buildRankedCells(model);
        const best = rankedMinor[0];
        const tr = createElement("tr");
        tr.appendChild(createElement("td","",String(num)));
        tr.appendChild(createElement("td","",`c${best.col}*r${best.row}`));
        tr.appendChild(createElement("td","",`${(best.score*100).toFixed(1)}%`));
        tbl2.appendChild(tr);
      });
      root.appendChild(tbl2);
    }

const suggestionBlock = createElement("div", "stats-basic-block");
    if (suggestion) {
      const percent = (suggestion.score * 100).toFixed(1);
      suggestionBlock.innerHTML = `
        <div class="stats-line">
          推薦優先刮點：<strong>c${suggestion.col} * r${suggestion.row}</strong>
          <span class="stats-hint">（相對強度：約 ${percent}%）</span>
        </div>
        <div class="stats-line stats-hint">
          ※ 世界模型 v1 目前僅考慮「盤面結構」（右側 / 底部 / 中央略高），後續可再逐步加入更多條件。
        </div>
      `;
    } else {
      suggestionBlock.innerHTML = `
        <div class="stats-line">沒有可推薦的格子（可能全部已翻開）。</div>
      `;
    }
    root.appendChild(suggestionBlock);

    // 顯示前 10 名推薦格（不過濾 revealed，單純看先驗分佈）
    const ranked = buildRankedCells(model);
    const topCount = Math.min(10, ranked.length);

    const tableTitle = createElement("div", "stats-section-title", "世界模型推薦格 TOP 10（先驗）");
    root.appendChild(tableTitle);

    if (topCount === 0) {
      const empty = createElement("div", "stats-placeholder", "尚無可顯示的格子。");
      root.appendChild(empty);
      return;
    }

    const table = createElement("table", "stats-table");
    const thead = createElement("thead");
    const headRow = createElement("tr");
    ["排名", "格子位置", "強度（相對）"].forEach((t) => {
      const th = createElement("th", "", t);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement("tbody");
    for (let i = 0; i < topCount; i++) {
      const item = ranked[i];
      const tr = createElement("tr");
      const rankTd = createElement("td", "", String(i + 1));
      const posTd = createElement("td", "", `c${item.col} * r${item.row}`);
      const percent = (item.score * 100).toFixed(1);
      const scoreTd = createElement("td", "", `${percent}%`);

      tr.appendChild(rankTd);
      tr.appendChild(posTd);
      tr.appendChild(scoreTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    root.appendChild(table);
  };

  render();
  return render;
}
