import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "";

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      if (dataInicial) params.append("data_inicial", dataInicial);
      if (dataFinal) params.append("data_final", dataFinal);

      const url = `${baseUrl}/api/series?${params.toString()}`;
      console.log("📡 Requisitando:", url);

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

  function limparFiltro() {
    setDataInicial("");
    setDataFinal("");
    carregar();
  }

  useEffect(() => {
    carregar();
  }, [equipamento]);

  const labels = dados.map((d) =>
    new Date(new Date(d.registro).getTime() + 3 * 60 * 60 * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    })
);
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🌦️ IoT Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 20,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          Equipamento:{" "}
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
          />
        </label>

        <label>
          Data inicial:{" "}
          <input
            type="datetime-local"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
          />
        </label>

        <label>
          Data final:{" "}
          <input
            type="datetime-local"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
          />
        </label>

        <button onClick={carregar}>🔍 Filtrar</button>
        <button onClick={limparFiltro}>❌ Limpar</button>
      </div>

      {loading && <p>Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {dados.length === 0 && !loading && !erro && (
        <p>Nenhum dado encontrado para este filtro.</p>
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
