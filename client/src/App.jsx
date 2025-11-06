import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("EQ1");

  useEffect(() => {
    const carregar = async () => {
      const url = `/api/series?equipamento=${equipamento}&aggregate=minute`;
      const resp = await fetch(url);
      const data = await resp.json();
      setDados(data);
    };
    carregar();
  }, [equipamento]);

  const labels = dados.map(d => new Date(d.ts).toLocaleString());
  const temperatura = dados.map(d => d.temperatura);
  const umidade = dados.map(d => d.umidade);
  const chuva = dados.map(d => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌤️ Dashboard IoT</h1>
      <label>
        Equipamento:
        <input
          style={{ marginLeft: 8 }}
          value={equipamento}
          onChange={e => setEquipamento(e.target.value)}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 30 }}>
        <div>
          <h3>Temperatura</h3>
          <Line
            data={{
              labels,
              datasets: [{ label: "Temperatura (°C)", data: temperatura, borderColor: "red" }]
            }}
          />
        </div>
        <div>
          <h3>Umidade</h3>
          <Line
            data={{
              labels,
              datasets: [{ label: "Umidade (%)", data: umidade, borderColor: "blue" }]
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Chuva</h3>
        <Bar
          data={{
            labels,
            datasets: [{ label: "Chuva (mm)", data: chuva, backgroundColor: "green" }]
          }}
        />
      </div>
    </div>
  );
}
