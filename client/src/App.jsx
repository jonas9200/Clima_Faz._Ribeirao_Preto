import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");

  useEffect(() => {
    // Lê a URL base da API (Render usa variável de ambiente)
    const baseUrl =
      import.meta.env.VITE_API_URL || "https://iot-dashboard-75bq.onrender.com";
    const url = `${baseUrl}/api/series?equipamento=${equipamento}`;

    console.log("📡 Buscando dados de:", url);

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Erro HTTP ${r.status}`);
        const data = await r.json();
        console.log("📊 Dados recebidos:", data);
        setDados(data);
      })
      .catch((err) => {
        console.error("❌ Erro ao buscar dados:", err);
        setDados([]);
      });
  }, [equipamento]);

  // Garante que o campo existe antes de mapear
  const labels = dados.map((d) => new Date(d.registro).toLocaleString());
  const temperatura = dados.map((d) => parseFloat(d.temperatura) || 0);
  const umidade = dados.map((d) => parseFloat(d.umidade) || 0);
  const chuva = dados.map((d) => parseFloat(d.chuva) || 0);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>🌦️ Dashboard IoT</h1>

      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <label style={{ marginRight: 10 }}>Equipamento:</label>
        <input
          value={equipamento}
          onChange={(e) => setEquipamento(e.target.value)}
          style={{
            padding: "5px 10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {dados.length === 0 ? (
        <p style={{ textAlign: "center" }}>Carregando dados...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 30,
            }}
          >
            <div>
              <h3 style={{ textAlign: "center" }}>Temperatura (°C)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura",
                      data: temperatura,
                      borderColor: "red",
                      backgroundColor: "rgba(255,0,0,0.1)",
                      tension: 0.3,
                    },
                  ],
                }}
              />
            </div>

            <div>
              <h3 style={{ textAlign: "center" }}>Umidade (%)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade",
                      data: umidade,
                      borderColor: "blue",
                      backgroundColor: "rgba(0,0,255,0.1)",
                      tension: 0.3,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div>
            <h3 style={{ textAlign: "center" }}>Chuva (mm)</h3>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva",
                    data: chuva,
                    backgroundColor: "rgba(0,128,0,0.6)",
                  },
                ],
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
