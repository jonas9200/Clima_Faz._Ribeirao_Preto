import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro("");
      try {
        const url = `${baseUrl}/api/series?equipamento=${encodeURIComponent(
          equipamento
        )}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Erro ao buscar dados do servidor");
        const json = await resp.json();
        setDados(json);
      } catch (e) {
        setErro("Falha ao carregar dados. Verifique a API.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [equipamento]);

  const labels = dados.map((d) =>
    new Date(d.registro).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  );
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ IoT Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Equipamento:{" "}
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
          />
        </label>
      </div>

      {loading && <p>Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {dados.length === 0 && !loading && !erro && (
        <p>Nenhum dado encontrado para este equipamento.</p>
      )}

      {dados.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 40,
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
                      tension: 0.2,
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
                      tension: 0.2,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div>
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
