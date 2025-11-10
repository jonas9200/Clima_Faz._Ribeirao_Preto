import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import { Cloud, Droplets, Thermometer, Calendar, Filter, X } from "lucide-react";
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
      console.log("📡 Buscando dados:", url);

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
        mapa[horaStr] = {
          count: 0,
          somaTemp: 0,
          somaUmid: 0,
          somaChuva: 0,
        };
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
    new Date(d.hora).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })
  );
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Calcular estatísticas
  const tempMedia = temperatura.length > 0 
    ? (temperatura.reduce((a, b) => a + b, 0) / temperatura.length).toFixed(1)
    : 0;
  const umidMedia = umidade.length > 0
    ? (umidade.reduce((a, b) => a + b, 0) / umidade.length).toFixed(1)
    : 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">AGS Clima</h1>
              <p className="text-sm text-gray-500">Monitoramento meteorológico em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipamento
              </label>
              <input
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data inicial
              </label>
              <input
                type="datetime-local"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data final
              </label>
              <input
                type="datetime-local"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => carregar()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={limparFiltro}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          </div>

          {/* Filtros Rápidos */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Períodos rápidos:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "24h", label: "Últimas 24h" },
                { key: "7d", label: "Última semana" },
                { key: "30d", label: "Último mês" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => calcularPeriodoRapido(p.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    periodo === p.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading e Erro */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {erro}
          </div>
        )}

        {!loading && !erro && agrupados.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 px-6 py-12 rounded-xl text-center">
            <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Nenhum dado encontrado</p>
            <p className="text-sm mt-2">Tente ajustar os filtros ou selecionar outro período</p>
          </div>
        )}

        {/* Cards de Resumo */}
        {!loading && !erro && agrupados.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Thermometer className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{tempMedia}°C</span>
                </div>
                <p className="text-red-100 font-medium">Temperatura Média</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Droplets className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{umidMedia}%</span>
                </div>
                <p className="text-blue-100 font-medium">Umidade Média</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Cloud className="w-8 h-8 opacity-80" />
                  <span className="text-3xl font-bold">{totalChuva.toFixed(1)}</span>
                </div>
                <p className="text-green-100 font-medium">Total de Chuva (mm)</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  Temperatura (°C)
                </h3>
                <div style={{ height: "300px" }}>
                  <Line
                    data={{
                      labels,
                      datasets: [
                        {
                          label: "Temperatura (°C)",
                          data: temperatura,
                          borderColor: "rgb(239, 68, 68)",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  Umidade (%)
                </h3>
                <div style={{ height: "300px" }}>
                  <Line
                    data={{
                      labels,
                      datasets: [
                        {
                          label: "Umidade (%)",
                          data: umidade,
                          borderColor: "rgb(59, 130, 246)",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-green-500" />
                Precipitação Acumulada por Hora (mm)
              </h3>
              <div style={{ height: "350px" }}>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Chuva (mm)",
                        data: chuva,
                        backgroundColor: "rgba(34, 197, 94, 0.8)",
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
