import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const baseUrl =
      import.meta.env.VITE_API_URL ||
      "https://iot-dashboard-75bq.onrender.com"; // 👉 troque pela URL do seu backend

    const url = `${baseUrl}/api/series?equipamento=${equipamento}`;

    setLoading(true);
    setErro("");

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Erro HTTP: ${r.status}`);
        return r.json();
      })
      .then(setDados)
      .catch((err) => setErro(err.message))
      .finally(() => setLoading(false));
  }, [equipamento]);

  const labels = dados.map((d) =>
    new Date(d.registro).toLocaleString("pt-BR", { hour12: false })
  );
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ Dashboard IoT</h1>

      <div>
        <label>
          Equipamento:{" "}
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
          />
        </label>
      </div>

      {loading && <p>⏳ Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>❌ Erro: {erro}</p>}

      {!loading && !erro && dados.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginTop: 20,
            }}
          >
            <div>
              <h3>Temperatura (°C)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura",
                      data: temperatura,
                      borderColor: "red",
                      fill: false,
                    },
                  ],
                }}
              />
            </div>

            <div>
              <h3>Umidade (%)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade",
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
            <h3>Chuva (mm)</h3>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva",
                    data: chuva,
                    backgroundColor: "green",
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
