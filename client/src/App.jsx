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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Detecta se é mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Função para converter UTC para Local (para os gráficos)
  function utcToLocal(utcString) {
    const date = new Date(utcString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // Função para formatar data para o input datetime-local (YYYY-MM-DDTHH:MM)
  function toLocalDatetimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // 📆 Filtros rápidos
  function calcularPeriodoRapido(p) {
    const agora = new Date();
    const inicio = new Date(agora);

    if (p === "24h") inicio.setHours(inicio.getHours() - 24);
    if (p === "7d") inicio.setDate(inicio.getDate() - 7);
    if (p === "30d") inicio.setDate(inicio.getDate() - 30);

    // Usa horário local para os inputs
    const inicioLocal = toLocalDatetimeString(inicio);
    const finalLocal = toLocalDatetimeString(agora);

    console.log("🕒 Período rápido:", p);
    console.log("⏰ Início (local):", inicioLocal);
    console.log("⏰ Final (local):", finalLocal);

    // Atualiza os estados primeiro
    setDataInicial(inicioLocal);
    setDataFinal(finalLocal);
    setPeriodo(p);

    // Converte para ISO (UTC) para a API
    const inicioISO = inicio.toISOString().slice(0, 19);
    const finalISO = agora.toISOString().slice(0, 19);
    
    console.log("🌐 Data inicial (ISO/UTC):", inicioISO);
    console.log("🌐 Data final (ISO/UTC):", finalISO);
    
    // Chama carregar com as datas UTC
    carregarComDatas(inicioISO, finalISO);
  }

  // 🔄 Carregar da API com datas específicas
  async function carregarComDatas(inicial, final) {
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
      console.log("✅ Dados carregados:", lista.length, "registros");
      
      if (lista.length > 0) {
        console.log("📅 Primeiro registro (UTC):", lista[0].registro);
        console.log("📅 Primeiro registro (Local):", utcToLocal(lista[0].registro));
        console.log("📅 Último registro (UTC):", lista[lista.length - 1].registro);
        console.log("📅 Último registro (Local):", utcToLocal(lista[lista.length - 1].registro));
      }
    } catch (e) {
      setErro("Falha ao carregar dados. Verifique a API.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // 🔄 Carregar da API usando os estados atuais
  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      
      // Converte as datas do formato local para UTC
      const dataInicialISO = dataInicial ? new Date(dataInicial).toISOString().slice(0, 19) : '';
      const dataFinalISO = dataFinal ? new Date(dataFinal).toISOString().slice(0, 19) : '';
      
      if (dataInicialISO) params.append("data_inicial", dataInicialISO);
      if (dataFinalISO) params.append("data_final", dataFinalISO);

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

  // 🧮 Agrupar por hora - CONVERTE UTC PARA LOCAL
  function agruparPorHora(lista) {
    const mapa = {};

    lista.forEach((d) => {
      // Converte UTC para Local
      const dataLocal = utcToLocal(d.registro);
      
      // Extrai apenas a parte da hora (YYYY-MM-DD HH:00)
      const horaStr = dataLocal.slice(0, 13) + ":00";

      if (!mapa[horaStr]) {
        mapa[horaStr] = {
          count: 0,
          somaTemp: 0,
          somaUmid: 0,
          somaChuva: 0,
          timestamp: new Date(d.registro).getTime()
        };
      }

      mapa[horaStr].count++;
      mapa[horaStr].somaTemp += Number(d.temperatura) || 0;
      mapa[horaStr].somaUmid += Number(d.umidade) || 0;
      mapa[horaStr].somaChuva += Number(d.chuva) || 0;
    });

    // Ordena pelos timestamps
    const horasOrdenadas = Object.keys(mapa).sort((a, b) => 
      mapa[a].timestamp - mapa[b].timestamp
    );

    return horasOrdenadas.map((h) => ({
      hora: h,
      timestamp: mapa[h].timestamp,
      temperatura: Number((mapa[h].somaTemp / mapa[h].count).toFixed(2)),
      umidade: Number((mapa[h].somaUmid / mapa[h].count).toFixed(2)),
      chuva: Number(mapa[h].somaChuva.toFixed(2)),
    }));
  }

  const agrupados = agruparPorHora(dados);

  // Labels vazios para remover textos abaixo dos gráficos
  const labels = agrupados.map(() => "");

  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Configurações dos gráficos sem labels
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const dataOriginal = agrupados[index];
            // Já está em formato local, só formata bonito
            const [datePart, timePart] = dataOriginal.hora.split(' ');
            const [hours] = timePart.split(':');
            const date = new Date(datePart + 'T' + hours + ':00:00');
            
            return date.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          },
          callback: function(value) {
            return value.toFixed(2);
          }
        }
      }
    }
  };

  // Estilos responsivos (mantidos iguais)
  // ... (os estilos permanecem os mesmos)

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🌦️ AGS Clima</h1>
            <p style={styles.subtitle}>Monitoramento Meteorológico em Tempo Real</p>
          </div>
          {!loading && !erro && agrupados.length > 0 && (
            <div style={styles.weatherCard}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? "0.7rem" : "0.8rem", opacity: 0.9 }}>Total de Chuva</div>
                <div style={{ fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: "bold" }}>{totalChuva.toFixed(2)} mm</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? "0.7rem" : "0.8rem", opacity: 0.9 }}>Período</div>
                <div style={{ fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: "bold" }}>{agrupados.length}h</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 🎛️ PAINEL DE CONTROLE */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>🔧 Filtros e Configurações</h3>
        
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Equipamento</label>
            <input
              style={styles.input}
              value={equipamento}
              onChange={(e) => setEquipamento(e.target.value)}
              placeholder="Nome do equipamento"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Data Inicial</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Data Final</label>
            <input
              type="datetime-local"
              style={styles.input}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => carregar()}>
            🔍 Aplicar Filtros
          </button>
          <button style={styles.secondaryButton} onClick={limparFiltro}>
            🗑️ Limpar
          </button>
        </div>
      </div>

      {/* ⏱️ FILTROS RÁPIDOS */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>⏱️ Período Rápido</h3>
        <div style={styles.quickFilters}>
          <button
            style={{
              ...styles.quickFilterButton,
              ...(periodo === "24h" ? styles.quickFilterActive : {})
            }}
            onClick={() => calcularPeriodoRapido("24h")}
          >
            ⏰ Últimas 24h
          </button>
          <button
            style={{
              ...styles.quickFilterButton,
              ...(periodo === "7d" ? styles.quickFilterActive : {})
            }}
            onClick={() => calcularPeriodoRapido("7d")}
          >
            📅 Última Semana
          </button>
          <button
            style={{
              ...styles.quickFilterButton,
              ...(periodo === "30d" ? styles.quickFilterActive : {})
            }}
            onClick={() => calcularPeriodoRapido("30d")}
          >
            📊 Último Mês
          </button>
        </div>
      </div>

      {/* 📊 STATUS E ERROS */}
      <div>
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Carregando dados meteorológicos...</span>
          </div>
        )}
        
        {erro && (
          <div style={styles.error}>
            ⚠️ {erro}
          </div>
        )}

        {!loading && !erro && agrupados.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📈</div>
            <h3>Nenhum dado encontrado</h3>
            <p>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* 📈 GRÁFICOS */}
      {agrupados.length > 0 && (
        <div>
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>🌡️ Temperatura (°C)</h3>
              </div>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Temperatura (°C)",
                      data: temperatura,
                      borderColor: "#ff6b6b",
                      backgroundColor: "rgba(255, 107, 107, 0.1)",
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>

            <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>💧 Umidade (%)</h3>
              </div>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Umidade (%)",
                      data: umidade,
                      borderColor: "#4dabf7",
                      backgroundColor: "rgba(77, 171, 247, 0.1)",
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>🌧️ Precipitação Acumulada (mm)</h3>
            </div>
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Chuva por hora (mm)",
                    data: chuva,
                    backgroundColor: "#51cf66",
                    borderRadius: 4,
                  },
                ],
              }}
              options={barOptions}
            />
          </div>

          {/* 🗓️ LEGENDA DE DATAS */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📅 Período dos Dados</h3>
            <div style={{ 
              background: "rgba(102, 126, 234, 0.1)", 
              padding: "12px", 
              borderRadius: "8px",
              fontSize: isMobile ? "0.8rem" : "0.9rem"
            }}>
              {agrupados.length > 0 && (
                <>
                  <div><strong>Data inicial:</strong> {agrupados[0].hora.replace(' ', ' às ')}</div>
                  <div><strong>Data final:</strong> {agrupados[agrupados.length - 1].hora.replace(' ', ' às ')}</div>
                </>
              )}
              <div style={{ marginTop: "8px", fontStyle: "italic" }}>
                Passe o mouse sobre os gráficos para ver os valores e datas específicas
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          input[type="datetime-local"] {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

