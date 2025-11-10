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
  const [periodo, setPeriodo] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  function calcularPeriodoRapido(p) {
    const agora = new Date();
    const final = agora.toISOString().slice(0, 19);
    const inicio = new Date(agora);

    if (p === "24h") inicio.setHours(inicio.getHours() - 24);
    if (p === "7d") inicio.setDate(inicio.getDate() - 7);
    if (p === "30d") inicio.setDate(inicio.getDate() - 30);

    const inicioISO = inicio.toISOString().slice(0, 19);
    setDataInicial(inicioISO);
    setDataFinal(final);
    setPeriodo(p);
    carregar(inicioISO, final);
  }

  async function carregar(inicial = dataInicial, final = dataFinal) {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      if (inicial) params.append("data_inicial", inicial);
      if (final) params.append("data_final", final);

      const url = `${baseUrl}/api/series?${params.toString()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar dados");
      const json = await resp.json();

      const lista = json.dados || [];
      setDados(lista);
      setTotalChuva(json.total_chuva || 0);
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
    setPeriodo("");
    carregar();
  }

  useEffect(() => {
    carregar();
  }, [equipamento]);

  function agruparPorHora(lista) {
    const mapa = {};
    lista.forEach((d) => {
      const data = new Date(d.registro);
      const horaStr = data.toISOString().slice(0, 13) + ":00";
      if (!mapa[horaStr]) {
        mapa[horaStr] = { count: 0, somaTemp: 0, somaUmid: 0, somaChuva: 0 };
      }
      mapa[horaStr].count++;
      mapa[horaStr].somaTemp += Number(d.temperatura) || 0;
      mapa[horaStr].somaUmid += Number(d.umidade) || 0;
      mapa[horaStr].somaChuva += Number(d.chuva) || 0;
    });

    const horas = Object.keys(mapa).sort();
    return horas.map((h) => ({
      hora: h,
      temperatura: mapa[h].somaTemp / mapa[h].count,
      umidade: mapa[h].somaUmid / mapa[h].count,
      chuva: mapa[h].somaChuva,
    }));
  }

  const agrupados = agruparPorHora(dados);
  const labels = agrupados.map((d) =>
    new Date(d.hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
  );
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
          🌦️ AGS Clima
        </h1>

        {/* FILTROS */}
        <div className="bg-white shadow-sm rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Equipamento</label>
            <input
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Data inicial</label>
            <input
              type="datetime-local"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Data final</label>
            <input
              type="datetime-local"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1"
            />
          </div>

          <button
            onClick={() => carregar()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            🔍 Filtrar
          </button>

          <button
            onClick={limparFiltro}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition"
          >
            ❌ Limpar
          </button>
        </div>

        {/* FILTROS RÁPIDOS */}
        <div className="bg-white shadow-sm rounded-xl p-4">
          <strong className="block mb-2">Período rápido:</strong>
          <div className="flex gap-3">
            {["24h", "7d", "30d"].map((p) => (
              <button
                key={p}
                onClick={() => calcularPeriodoRapido(p)}
                className={`px-4 py-2 rounded-md border ${
                  periodo === p
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 hover:bg-gray-200"
                } transition`}
              >
                {p === "24h" && "Últimas 24h"}
                {p === "7d" && "Última semana"}
                {p === "30d" && "Último mês"}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {erro && <p className="text-red-600 font-semibold">{erro}</p>}

        {!loading && !erro && agrupados.length === 0 && (
          <p className="text-gray-500 text-center">
            Nenhum dado encontrado para este filtro.
          </p>
        )}

        {!loading && !erro && agrupados.length > 0 && (
          <>
            {/* RESUMO */}
            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-2">📊 Resumo do Período</h3>
              <p className="text-gray-700">
                <strong>Total de chuva:</strong> {totalChuva.toFixed(2)} mm
              </p>
            </div>

            {/* GRÁFICOS */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white shadow-sm rounded-xl p-4">
                <h3 className="font-medium text-gray-700 mb-2">
                  Temperatura (°C)
                </h3>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Temperatura (°C)",
                        data: temperatura,
                        borderColor: "rgb(239,68,68)",
                        tension: 0.2,
                      },
                    ],
                  }}
                />
              </div>

              <div className="bg-white shadow-sm rounded-xl p-4">
                <h3 className="font-medium text-gray-700 mb-2">Umidade (%)</h3>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Umidade (%)",
                        data: umidade,
                        borderColor: "rgb(37,99,235)",
                        tension: 0.2,
                      },
                    ],
                  }}
                />
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-4">
              <h3 className="font-medium text-gray-700 mb-2">
                Chuva acumulada por hora (mm)
              </h3>
              <p className="mb-3">
                <strong>Total acumulado:</strong> {totalChuva.toFixed(2)} mm
              </p>
              <Bar
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Chuva por hora (mm)",
                      data: chuva,
                      backgroundColor: "rgb(34,197,94)",
                    },
                  ],
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
