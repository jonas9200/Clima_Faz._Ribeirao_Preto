import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");

  useEffect(() => {
    const baseUrl = "https://iot-dashboard-75bq.onrender.com";
    const url = `${baseUrl}/api/series?equipamento=${equipamento}`;
    console.log("Buscando dados de:", url);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        console.log("Dados recebidos:", data);
        setDados(data);
      })
      .catch((err) => console.error("Erro ao buscar dados:", err));
  }, [equipamento]);

  const labels = dados.map((d) => new Date(d.registro).toLocaleString());
  const temperatura = dados.map((d) => parseFloat(d.temperatura));
  const umidade = dados.map((d) => parseFloat(d.umidade));
  const chuva = dados.map((d) => parseFloat(d.chuva));

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ Dashboard IoT</h1>
      <div>
        Equipamento:{" "}
        <input
          value={equipamento}
          onChange={(e) => setEquipamento(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h3>Temperatura</h3>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Temperatura (°C)",
                  data: temperatura,
                  borderColor: "red",
                  fill: false,
                },
              ],
            }}
          />
        </div>
        <div>
          <h3>Umidade</h3>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Umidade (%)",
                  data: umidade,
                  borderColor: "blue",
                  fill: false,
                },
              ],
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Chuva</h3>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Chuva (mm)",
                data: chuva,
                backgroundColor: "green",
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
