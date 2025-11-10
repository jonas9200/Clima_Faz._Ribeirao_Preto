import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamento, setEquipamento] = useState("Pluviometro_01");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);
  const [periodo, setPeriodo] = useState("semana");
  const [erro, setErro] = useState("");

  // 🔗 API base (sem barra no final)
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  // ✅ Verificação inicial
  useEffect(() => {
    console.log("🌐 API configurada:", baseUrl);
  }, []);

  const aplicarPeriodo = (tipo) => {
    const agora = new Date();
    let inicio = new Date();

    if (tipo === "24h") inicio.setHours(agora.getHours() - 24);
    if (tipo === "semana") inicio.setDate(agora.getDate() - 7);
    if (tipo === "mes") inicio.setMonth(agora.getMonth() - 1);

    setDataInicial(inicio.toISOString().slice(0, 19));
    setDataFinal(agora.toISOString().slice(0, 19));
    setPeriodo(tipo);
  };

  useEffect(() => {
    const carregar = async () => {
      try {
        setErro("");
        if (!baseUrl) throw new Error("VITE_API_URL não configurada.");

        let url = `${baseUrl}/api/series?equipamento=${equipamento}`;
        if (dataInicial) url += `&data_inicial=${dataInicial}`;
        if (dataFinal) url += `&data_final=${dataFinal}`;

        console.log("🔍 Buscando:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

        const json = await res.json();
        if (!json.dados) throw new Error("Formato inválido da API.");

        setDados(json.dados);
        setTotalChuva(json.total_chuva || 0);
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err);
        setErro(err.message);
        setDados([]);
      }
    };

    carregar();
  }, [equipamento, dataInicial, dataFinal]);

  const labels = dados.map((d) =>
    new Date(d.hora).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  const temperatura = dados.map((d) => d.temperatura);
  const umidade = dados.map((d) => d.umidade);
  const chuva = dados.map((d) => d.chuva);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>🌦️ Dashboard IoT</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <label>
          Equipamento:
          <input
            value={equipamento}
            onChange={(e) => setEquipamento(e.target.value)}
            style={{ marginLeft: 6, padding: 4 }}
          />
        </label>

        <label>
          Início:
          <input
            type="datetime-local"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            style={{ marginLeft: 6 }}
          />
        </label>

        <label>
          Fim:
          <input
            type="datetime-local"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            style={{ marginLeft: 6 }}
          />
        </label>

        <button
          onClick={() => aplicarPeriodo("24h")}
          style={{
            background: periodo === "24h" ? "#2196f3" : "#eee",
            color: periodo === "24h" ? "#fff" : "#000",
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          Últimas 24h
        </button>

        <button
          onClick={() => aplicarPeriodo("semana")}
          style={{
            background: periodo === "semana" ? "#2196f3" : "#eee",
            color: periodo === "semana" ? "#fff" : "#000",
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          Última semana
        </button>

        <button
          onClick={() => aplicarPeriodo("mes")}
          style={{
            background: periodo === "mes" ? "#2196f3" : "#eee",
            color: periodo === "mes" ? "#fff" : "#000",
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          Último mês
        </button>
      </div>

      {erro ? (
        <p style={{ color: "red" }}>⚠️ {erro}</p>
      ) : dados.length === 0 ? (
        <p>⏳ Carregando ou sem dados disponíveis.</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <h3>Temperatura média (°C)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura (°C)",
                      data: temperatura,
                      borderColor: "red",
                      tension: 0.3,
                    },
                  ],
                }}
              />
            </div>

            <div>
              <h3>Umidade média (%)</h3>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade (%)",
                      data: umidade,
                      borderColor: "blue",
                      tension: 0.3,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 30 }}>
            <h3>Chuva acumulada (mm)</h3>
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
            <h4 style={{ marginTop: 10 }}>
              🌧️ Total no período: <b>{totalChuva.toFixed(2)} mm</b>
            </h4>
          </div>
        </>
      )}
    </div>
  );
}
