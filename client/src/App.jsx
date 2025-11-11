import { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamento, setEquipamento] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(false);
  const [erro, setErro] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // 🔄 Carregar lista de equipamentos
  useEffect(() => {
    carregarEquipamentos();
  }, []);

  async function carregarEquipamentos() {
    setLoadingEquipamentos(true);
    try {
      const url = `${baseUrl}/api/equipamentos`;
      console.log("📡 Buscando equipamentos:", url);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar equipamentos");
      const json = await resp.json();
      
      const listaEquipamentos = json.equipamentos || [];
      console.log("✅ Equipamentos carregados:", listaEquipamentos);
      setEquipamentos(listaEquipamentos);
      
      if (listaEquipamentos.length > 0 && !equipamento) {
        setEquipamento(listaEquipamentos[0]);
      }
    } catch (e) {
      console.error("Erro ao carregar equipamentos:", e);
      setEquipamentos(["Pluviometro_01"]);
      setErro("Erro ao carregar equipamentos. Usando equipamento padrão.");
    } finally {
      setLoadingEquipamentos(false);
    }
  }

  // Função para converter data para formato do input (YYYY-MM-DDTHH:MM)
  function toLocalDatetimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Função para converter input para formato do banco (YYYY-MM-DD HH:MM:SS)
  function toDatabaseFormat(datetimeString) {
    if (!datetimeString) return '';
    const date = new Date(datetimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // 📆 Filtros rápidos
  function calcularPeriodoRapido(p) {
    const agora = new Date();
    const inicio = new Date(agora);

    if (p === "24h") {
      inicio.setHours(inicio.getHours() - 24);
    } else if (p === "7d") {
      inicio.setDate(inicio.getDate() - 7);
    } else if (p === "30d") {
      inicio.setDate(inicio.getDate() - 30);
    }

    // Atualiza os estados para mostrar ao usuário
    setDataInicial(toLocalDatetimeString(inicio));
    setDataFinal(toLocalDatetimeString(agora));
    setPeriodo(p);

    // Envia as datas no formato do banco
    const inicioBanco = toDatabaseFormat(toLocalDatetimeString(inicio));
    const finalBanco = toDatabaseFormat(toLocalDatetimeString(agora));

    console.log("🕒 Período rápido:", p);
    console.log("📅 Data inicial:", inicioBanco);
    console.log("📅 Data final:", finalBanco);

    carregarComDatas(inicioBanco, finalBanco);
  }

  // 🔄 Carregar da API com datas específicas
  async function carregarComDatas(inicial, final) {
    if (!equipamento) {
      setErro("Selecione um equipamento primeiro");
      return;
    }

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
      console.log("✅ Dados recebidos:", lista.length, "registros");
      setDados(lista);
      setTotalChuva(json.total_chuva || 0);
      
    } catch (e) {
      console.error("Erro:", e);
      setErro("Falha ao carregar dados. Verifique a conexão com a API.");
    } finally {
      setLoading(false);
    }
  }

  // 🔄 Carregar da API usando os estados atuais
  async function carregar() {
    if (!equipamento) {
      setErro("Selecione um equipamento primeiro");
      return;
    }

    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      
      const dataInicialBanco = toDatabaseFormat(dataInicial);
      const dataFinalBanco = toDatabaseFormat(dataFinal);
      
      if (dataInicialBanco) params.append("data_inicial", dataInicialBanco);
      if (dataFinalBanco) params.append("data_final", dataFinalBanco);

      const url = `${baseUrl}/api/series?${params.toString()}`;
      console.log("📡 Buscando dados:", url);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar dados");
      const json = await resp.json();

      const lista = json.dados || [];
      console.log("✅ Dados recebidos:", lista.length, "registros");
      setDados(lista);
      setTotalChuva(json.total_chuva || 0);
    } catch (e) {
      console.error("Erro:", e);
      setErro("Falha ao carregar dados. Verifique a conexão com a API.");
    } finally {
      setLoading(false);
    }
  }

  function limparFiltro() {
    setDataInicial("");
    setDataFinal("");
    setPeriodo("");
    if (equipamento) {
      carregar();
    }
  }

  // Carregar dados quando equipamento mudar
  useEffect(() => {
    if (equipamento) {
      console.log("🔄 Equipamento alterado para:", equipamento);
      carregar();
    }
  }, [equipamento]);

  // 🧮 Agrupar por hora
  function agruparPorHora(lista) {
    if (!lista || lista.length === 0) return [];

    const mapa = {};

    lista.forEach((d) => {
      if (!d.registro) return;
      
      // Usa o horário exato que veio do banco
      const registro = d.registro;
      
      // Extrai a parte da hora (YYYY-MM-DD HH:00)
      let horaStr;
      if (registro.includes('T')) {
        // Formato ISO
        horaStr = registro.slice(0, 13) + ":00:00";
      } else {
        // Formato string do banco
        horaStr = registro.slice(0, 13) + ":00:00";
      }

      if (!mapa[horaStr]) {
        mapa[horaStr] = {
          count: 0,
          somaTemp: 0,
          somaUmid: 0,
          somaChuva: 0,
          timestamp: new Date(registro).getTime()
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

  // Configurações dos gráficos
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
            return new Date(dataOriginal.hora).toLocaleString('pt-BR', {
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
            size: 12
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
            size: 12
          },
          callback: function(value) {
            return value.toFixed(2);
          }
        }
      }
    }
  };

  // Estilos para desktop
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      minWidth: "1200px",
    },
    header: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "24px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    },
    headerContent: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
    },
    title: {
      margin: 0,
      fontSize: "2rem",
      fontWeight: "700",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      margin: "4px 0 0 0",
      color: "#666",
      fontSize: "1rem",
    },
    weatherCard: {
      display: "flex",
      gap: "32px",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      padding: "16px 24px",
      borderRadius: "12px",
      color: "white",
      width: "auto",
      justifyContent: "flex-start",
    },
    card: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
    },
    cardTitle: {
      margin: "0 0 16px 0",
      fontSize: "1.2rem",
      fontWeight: "600",
      color: "#333",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "12px",
      marginBottom: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      marginBottom: "6px",
      fontWeight: "500",
      color: "#555",
      fontSize: "0.9rem",
    },
    input: {
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "0.9rem",
      backgroundColor: "white",
    },
    select: {
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "0.9rem",
      backgroundColor: "white",
      cursor: "pointer",
    },
    buttonGroup: {
      display: "flex",
      flexDirection: "row",
      gap: "10px",
    },
    primaryButton: {
      padding: "10px 20px",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    secondaryButton: {
      padding: "10px 20px",
      background: "transparent",
      color: "#666",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    quickFilters: {
      display: "flex",
      flexDirection: "row",
      gap: "10px",
      flexWrap: "wrap",
    },
    quickFilterButton: {
      padding: "10px 14px",
      background: "transparent",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "0.9rem",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.3s ease",
    },
    quickFilterActive: {
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      borderColor: "transparent",
    },
    loading: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "16px",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "8px",
      color: "#666",
      justifyContent: "center",
      fontSize: "1rem",
    },
    spinner: {
      width: "18px",
      height: "18px",
      border: "2px solid #e0e0e0",
      borderTop: "2px solid #667eea",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    error: {
      padding: "14px",
      background: "rgba(255, 107, 107, 0.1)",
      border: "1px solid #ff6b6b",
      borderRadius: "8px",
      color: "#d63031",
      textAlign: "center",
      fontSize: "1rem",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      color: "#666",
    },
    chartsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "20px",
    },
    chartCard: {
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: "12px",
      padding: "20px",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
      height: "350px",
    },
    chartHeader: {
      marginBottom: "16px",
      textAlign: "center",
    },
    chartTitle: {
      margin: 0,
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#333",
    },
  };

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
                <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>Total de Chuva</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>{totalChuva.toFixed(2)} mm</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>Período</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>{agrupados.length}h</div>
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
            {loadingEquipamentos ? (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                <span>Carregando equipamentos...</span>
              </div>
            ) : (
              <select
                style={styles.select}
                value={equipamento}
                onChange={(e) => setEquipamento(e.target.value)}
              >
                <option value="">Selecione um equipamento</option>
                {equipamentos.map((eqp) => (
                  <option key={eqp} value={eqp}>
                    {eqp}
                  </option>
                ))}
              </select>
            )}
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
          <button 
            style={styles.primaryButton} 
            onClick={() => carregar()}
            onMouseOver={(e) => e.target.style.opacity = "0.8"}
            onMouseOut={(e) => e.target.style.opacity = "1"}
            disabled={!equipamento}
          >
            🔍 Aplicar Filtros
          </button>
          <button 
            style={styles.secondaryButton} 
            onClick={limparFiltro}
            onMouseOver={(e) => e.target.style.backgroundColor = "#f5f5f5"}
            onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
          >
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
            onMouseOver={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "#f5f5f5")}
            onMouseOut={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "transparent")}
            disabled={!equipamento}
          >
            ⏰ Últimas 24h
          </button>
          <button
            style={{
              ...styles.quickFilterButton,
              ...(periodo === "7d" ? styles.quickFilterActive : {})
            }}
            onClick={() => calcularPeriodoRapido("7d")}
            onMouseOver={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "#f5f5f5")}
            onMouseOut={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "transparent")}
            disabled={!equipamento}
          >
            📅 Última Semana
          </button>
          <button
            style={{
              ...styles.quickFilterButton,
              ...(periodo === "30d" ? styles.quickFilterActive : {})
            }}
            onClick={() => calcularPeriodoRapido("30d")}
            onMouseOver={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "#f5f5f5")}
            onMouseOut={(e) => !styles.quickFilterActive.backgroundColor && (e.target.style.backgroundColor = "transparent")}
            disabled={!equipamento}
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

        {!loading && !erro && agrupados.length === 0 && equipamento && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📈</div>
            <h3>Nenhum dado encontrado</h3>
            <p>Não há dados disponíveis para os filtros selecionados.</p>
          </div>
        )}

        {!equipamento && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📡</div>
            <h3>Selecione um equipamento</h3>
            <p>Escolha um equipamento da lista para visualizar os dados.</p>
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
              fontSize: "0.9rem"
            }}>
              {agrupados.length > 0 && (
                <>
                  <div><strong>Equipamento:</strong> {equipamento}</div>
                  <div><strong>Data inicial:</strong> {new Date(agrupados[0].hora).toLocaleString('pt-BR')}</div>
                  <div><strong>Data final:</strong> {new Date(agrupados[agrupados.length - 1].hora).toLocaleString('pt-BR')}</div>
                  <div><strong>Total de horas:</strong> {agrupados.length} horas</div>
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
        
        /* Forçar comportamento desktop */
        body {
          margin: 0;
          padding: 0;
          min-width: 1200px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
