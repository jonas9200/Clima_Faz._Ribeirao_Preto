import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL;

  // Função principal para buscar dados da API
  async function carregar() {
    if (!equipamento) return;
    setCarregando(true);
    setErro("");

    try {
      const params = new URLSearchParams({ equipamento });
      if (dataInicial) params.append("data_inicial", dataInicial);
      if (dataFinal) params.append("data_final", dataFinal);

      const resp = await fetch(`${baseUrl}/api/series?${params.toString()}`);
      if (!resp.ok) throw new Error("Erro ao buscar dados");

      const json = await resp.json();
      setDados(json.dados || []);
      setTotalChuva(json.total_chuva || 0);
    } catch (e) {
      console.error(e);
      setErro("Falha ao carregar dados. Verifique a API.");
    } finally {
      setCarregando(false);
    }
  }

  // Carrega dados iniciais ao abrir
  useEffect(() => {
    carregar();
  }, [equipamento]);

  // Funções auxiliares para atalhos rápidos
  const agora = new Date();
  const gerarIntervalo = (horas) => {
    const fim = agora.toISOString().slice(0, 19);
    const inicio = new Date(agora.getTime() - horas * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19);
    setDataInicial(inicio);
    setDataFinal(fim);
  };

  // Dados para os gráficos
  const labels = dados.map((d) =>
    new Date(d.hora).toLocaleString("pt-BR", { hour: "2-digit", day: "2-digit", month: "2-digit" })
  );
  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>🌦️ Dashboard IoT</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Equipamento: </label>
        <input
          value={equipamento}
          onChange={(e) => setEquipamento(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <label>Data inicial: </label>
        <input
          type="datetime-local"
          value={dataInicial}
          onChange={(e) => setDataInicial(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <label>Data final: </label>
        <input
          type="datetime-local"
          value={dataFinal}
          onChange={(e) => setDataFinal(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <button onClick={carregar}>🔍 Filtrar</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <strong>Filtros rápidos: </strong>
        <button onClick={() => gerarIntervalo(24)}>Últimas 24h</button>{" "}
        <button onClick={() => gerarIntervalo(24 * 7)}>Última semana</button>{" "}
        <button onClick={() => gerarIntervalo(24 * 30)}>Último mês</button>
      </div>

      {erro && <p style={{ color: "red" }}>{erro}</p>}
      {carregando && <p>⏳ Carregando dados...</p>}

      {!carregando && dados.length > 0 && (
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
              <h3>🌡️ Temperatura média por hora (°C)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura média (°C)",
                      data: temperatura,
                      borderColor: "red",
                      backgroundColor: "rgba(255,0,0,0.2)",
                    },
                  ],
                }}
              />
            </div>

            <div>
              <h3>💧 Umidade média por hora (%)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade média (%)",
                      data: umidade,
                      borderColor: "blue",
                      backgroundColor: "rgba(0,0,255,0.2)",
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <h3>🌧️ Chuva acumulada por hora (mm)</h3>
            <p>
              <strong>Total de chuva no período:</strong>{" "}
              {totalChuva.toFixed(2)} mm
            </p>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva acumulada (mm)",
                    data: chuva,
                    backgroundColor: "rgba(0,128,0,0.6)",
                  },
                ],
              }}
            />
          </div>
        </>
      )}

      {!carregando && dados.length === 0 && !erro && (
        <p>Nenhum dado encontrado para o período selecionado.</p>
      )}
    </div>
  );
}
