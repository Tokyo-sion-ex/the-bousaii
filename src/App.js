import React, { useState, useEffect } from "react";
import "./styles.css";

// 都道府県リスト（気象庁APIの表記に合わせる）
const PREFECTURES = [
  "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
  "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
  "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
  "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
  "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
  "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
  "熊本", "大分", "宮崎", "鹿児島", "沖縄"
];

// プレースホルダー置換関数
const fillTemplate = (template, data) => {
  return template
    .replace(/{time}/g, data.time)
    .replace(/{epicenter}/g, data.epicenter)
    .replace(/{magnitude}/g, data.magnitude)
    .replace(/{maxIntensity}/g, data.maxIntensity)
    .replace(/{prefecture}/g, data.prefecture);
};

export default function App() {
  const [selectedPref, setSelectedPref] = useState(PREFECTURES[0]);
  const [earthquakes, setEarthquakes] = useState([]);
  const [selectedEq, setSelectedEq] = useState(null);
  const [template, setTemplate] = useState(
    "【地震情報】{time} 発生。震源地は {epicenter}、M{magnitude}、最大震度 {maxIntensity}。（{prefecture}県庁所在地）"
  );
  const [filled, setFilled] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 都道府県変更時に地震リストを取得
  useEffect(() => {
    const fetchEarthquakes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://www.jma.go.jp/bosai/quake/data/list.json"
        );
        if (!response.ok) throw new Error("API接続エラー");
        const data = await response.json();

        // 選択された都道府県が pref 配列に含まれる地震のみフィルタリング
        const filtered = data
          .filter((eq) => eq.pref && eq.pref.includes(selectedPref))
          .sort((a, b) => new Date(b.time) - new Date(a.time)); // 新しい順

        setEarthquakes(filtered);
        setSelectedEq(filtered.length > 0 ? filtered[0] : null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEarthquakes();
  }, [selectedPref]);

  // 選択地震が変わったらテンプレートを更新
  useEffect(() => {
    if (selectedEq) {
      // 日時を整形 (例: 2025年3月15日 14:30)
      const date = new Date(selectedEq.time);
      const formattedTime = `${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日 ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;

      const data = {
        time: formattedTime,
        epicenter: selectedEq.name || "不明",
        magnitude: selectedEq.mag ? `M${selectedEq.mag}` : "M不明",
        maxIntensity: selectedEq.maxInt || "不明",
        prefecture: selectedPref
      };
      setFilled(fillTemplate(template, data));
    } else {
      setFilled("該当する地震がありません");
    }
  }, [selectedEq, template, selectedPref]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(filled);
      alert("クリップボードにコピーしました！");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <div className="app">
      <h1>地震情報テンプレート生成</h1>

      <div className="selector">
        <label>都道府県: </label>
        <select
          value={selectedPref}
          onChange={(e) => setSelectedPref(e.target.value)}
        >
          {PREFECTURES.map((pref) => (
            <option key={pref} value={pref}>
              {pref}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>読み込み中...</p>}
      {error && <p className="error">エラー: {error}</p>}

      {!loading && !error && (
        <>
          <div className="selector">
            <label>地震を選択: </label>
            <select
              value={selectedEq?.id || ""}
              onChange={(e) => {
                const eq = earthquakes.find((eq) => eq.id === e.target.value);
                setSelectedEq(eq);
              }}
              disabled={earthquakes.length === 0}
            >
              {earthquakes.length === 0 ? (
                <option>該当する地震なし</option>
              ) : (
                earthquakes.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {new Date(eq.time).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}{" "}
                    - {eq.name} (M{eq.mag})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="template-section">
            <h3>テンプレート (編集可能)</h3>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              cols={60}
            />
          </div>

          <div className="result-section">
            <h3>生成結果</h3>
            <pre>{filled}</pre>
            <button onClick={copyToClipboard}>コピー</button>
          </div>
        </>
      )}
    </div>
  );
}
