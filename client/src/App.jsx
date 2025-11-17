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
  const [periodo, setPeriodo] = useState("24h");
  const [totalChuva, setTotalChuva] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("chuva");
  
  // Novos estados para o mapa e cadastro de equipamentos
  const [showMap, setShowMap] = useState(false);
  const [novoEquipamento, setNovoEquipamento] = useState({
    nome: "",
    latitude: "",
    longitude: ""
  });
  const [cadastrando, setCadastrando] = useState(false);
  const [mapaCarregado, setMapaCarregado] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Detecta se é mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔄 Carregar lista de equipamentos
  useEffect(() => {
    carregarEquipamentos();
  }, []);

  async function carregarEquipamentos() {
    setLoadingEquipamentos(true);
    try {
      const url = `${baseUrl}/api/equipamentos`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar equipamentos");
      const json = await resp.json();
      
      const listaEquipamentos = json.equipamentos || [];
      setEquipamentos(listaEquipamentos);
      
      // ✅ SEMPRE define o primeiro equipamento quando a lista estiver pronta
      if (listaEquipamentos.length > 0) {
        setEquipamento(listaEquipamentos[0]);
      }
    } catch (e) {
      console.error("Erro ao carregar equipamentos:", e);
      const listaPadrao = ["Pluviometro_01"];
      setEquipamentos(listaPadrao);
      setEquipamento(listaPadrao[0]);
    } finally {
      setLoadingEquipamentos(false);
    }
  }

  // 🔄 NOVO: Aplicar filtro das 24h automaticamente quando equipamento estiver disponível
  useEffect(() => {
    if (equipamento && equipamento !== "") {
      console.log("🎯 Aplicando filtro automático das 24h para:", equipamento);
      // Pequeno delay para garantir que tudo está carregado
      setTimeout(() => {
        calcularPeriodoRapido("24h");
      }, 100);
    }
  }, [equipamento]);

  // 🗺️ Funções para o mapa e cadastro de equipamentos
  const handleCadastrarEquipamento = async () => {
    if (!novoEquipamento.nome || !novoEquipamento.latitude || !novoEquipamento.longitude) {
      setErro("Preencha todos os campos para cadastrar o equipamento");
      return;
    }

    setCadastrando(true);
    try {
      // Aqui você implementaria a chamada para sua API
      const response = await fetch(`${baseUrl}/api/equipamentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(novoEquipamento),
      });

      if (response.ok) {
        // Limpar formulário e recarregar equipamentos
        setNovoEquipamento({ nome: "", latitude: "", longitude: "" });
        setErro("");
        carregarEquipamentos();
        alert("Equipamento cadastrado com sucesso!");
      } else {
        throw new Error("Erro ao cadastrar equipamento");
      }
    } catch (error) {
      setErro("Erro ao cadastrar equipamento: " + error.message);
    } finally {
      setCadastrando(false);
    }
  };

  const handleMapClick = (e) => {
    if (!showMap) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Simulação de coordenadas baseadas na posição do clique
    const lat = (-14.2350 + ((y / rect.height) - 0.5) * 0.1).toFixed(6);
    const lng = (-51.9253 + ((x / rect.width) - 0.5) * 0.1).toFixed(6);
    
    setNovoEquipamento(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

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

    setDataInicial(toLocalDatetimeString(inicio));
    setDataFinal(toLocalDatetimeString(agora));
    setPeriodo(p);

    const inicioBanco = toDatabaseFormat(toLocalDatetimeString(inicio));
    const finalBanco = toDatabaseFormat(toLocalDatetimeString(agora));

    console.log(`📊 Aplicando filtro ${p}:`, { inicioBanco, finalBanco });
    carregarComDatas(inicioBanco, finalBanco);
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

  // 🔄 Carregar da API usando os estados atuais
  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ equipamento });
      
      const dataInicialBanco = toDatabaseFormat(dataInicial);
      const dataFinalBanco = toDatabaseFormat(dataFinal);
      
      if (dataInicialBanco) params.append("data_inicial", dataInicialBanco);
      if (dataFinalBanco) params.append("data_final", dataFinalBanco);

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
    // Ao limpar, volta para as 24h
    setTimeout(() => {
      calcularPeriodoRapido("24h");
    }, 100);
  }

  // 🧮 Agrupar por hora - USA O HORÁRIO EXATO DO BANCO
  function agruparPorHora(lista) {
    const mapa = {};

    lista.forEach((d) => {
      const registro = d.registro;
      
      let horaStr;
      if (registro.includes('T')) {
        horaStr = registro.slice(0, 13) + ":00:00";
      } else {
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
  const labels = agrupados.map(() => "");
  const temperatura = agrupados.map((d) => d.temperatura);
  const umidade = agrupados.map((d) => d.umidade);
  const chuva = agrupados.map((d) => d.chuva);

  // Configurações dos gráficos para dark mode
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#e2e8f0'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        titleFont: {
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 13
        },
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
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8',
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
          color: 'rgba(148, 163, 184, 0.2)'
        },
        ticks: {
          color: '#94a3b8',
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

  // Estilos DARK MODE com tema azul - OTIMIZADO
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: isMobile ? "10px" : "20px",
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#e2e8f0"
    },
    // ... (mantenha todos os outros estilos existentes)

    // 🗺️ Novos estilos para o mapa
    mapCard: {
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "15px",
      padding: isMobile ? "20px" : "25px",
      marginBottom: isMobile ? "20px" : "25px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    mapContainer: {
      position: "relative",
      width: "100%",
      height: isMobile ? "300px" : "400px",
      background: "#1e293b",
      borderRadius: "12px",
      overflow: "hidden",
      border: "2px solid #475569",
      cursor: showMap ? "crosshair" : "default",
      marginBottom: "20px",
    },
    mapImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      opacity: 0.8,
    },
    mapOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(30, 41, 59, 0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: isMobile ? "1rem" : "1.2rem",
      fontWeight: "500",
      textAlign: "center",
      padding: "20px",
    },
    mapMarker: {
      position: "absolute",
      width: "24px",
      height: "24px",
      background: "#ef4444",
      border: "3px solid white",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      cursor: "pointer",
      zIndex: 10,
    },
    mapMarkerPulse: {
      position: "absolute",
      width: "40px",
      height: "40px",
      background: "rgba(239, 68, 68, 0.4)",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      animation: "pulse 1.5s infinite",
    },
    mapControls: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
    },
    mapForm: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gap: "15px",
      marginBottom: "20px",
    },
    equipmentList: {
      marginTop: "20px",
      padding: "15px",
      background: "rgba(30, 41, 59, 0.6)",
      borderRadius: "10px",
      border: "1px solid rgba(100, 116, 139, 0.2)"
    },
    equipmentItem: {
      padding: "10px 15px",
      marginBottom: "8px",
      background: "rgba(30, 41, 59, 0.8)",
      borderRadius: "8px",
      border: "1px solid rgba(100, 116, 139, 0.3)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    coordinatesDisplay: {
      background: "rgba(30, 41, 59, 0.8)",
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #475569",
      marginBottom: "15px",
      fontSize: "0.9rem",
    }
  };

  // Função para renderizar o gráfico ativo com cores azuis
  const renderActiveChart = () => {
    switch (activeTab) {
      case "chuva":
        return (
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: "Chuva por hora (mm)",
                  data: chuva,
                  backgroundColor: "rgba(96, 165, 250, 0.8)",
                  borderColor: "#60a5fa",
                  borderWidth: 2,
                  borderRadius: 6,
                },
              ],
            }}
            options={barOptions}
          />
        );
      case "temperatura":
        return (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Temperatura (°C)",
                  data: temperatura,
                  borderColor: "#f87171",
                  backgroundColor: "rgba(248, 113, 113, 0.1)",
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        );
      case "umidade":
        return (
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Umidade (%)",
                  data: umidade,
                  borderColor: "#60a5fa",
                  backgroundColor: "rgba(96, 165, 250, 0.1)",
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* 🎯 HEADER ELEGANTE - DARK MODE */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <div style={styles.titleSection}>
              <div style={styles.logo}>🌦️</div>
              <div>
                <h1 style={styles.title}>Fazenda Ribeirão Preto</h1>
                <p style={styles.subtitle}>Monitoramento Meteorológico</p>
              </div>
            </div>
          </div>
          
          {!loading && !erro && agrupados.length > 0 && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{totalChuva.toFixed(2)} mm</div>
                <div style={styles.statLabel}>Total de Chuva</div>
              </div>
              {!isMobile && (
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{equipamento}</div>
                  <div style={styles.statLabel}>Equipamento</div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 🗺️ CARD DO MAPA E CADASTRO DE EQUIPAMENTOS */}
      <div style={styles.mapCard}>
        <h3 style={styles.cardTitle}>🗺️ Mapa de Equipamentos</h3>
        
        <div style={styles.mapControls}>
          <button 
            style={{
              ...styles.primaryButton,
              background: showMap ? "#ef4444" : "linear-gradient(135deg, #1e40af, #3b82f6)"
            }}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "❌ Cancelar" : "📍 Adicionar Equipamento no Mapa"}
          </button>
          
          {showMap && (
            <button 
              style={styles.secondaryButton}
              onClick={() => {
                setNovoEquipamento({ nome: "", latitude: "", longitude: "" });
                setShowMap(false);
              }}
            >
              🗑️ Limpar Seleção
            </button>
          )}
        </div>

        {/* COORDENADAS SELECIONADAS */}
        {(novoEquipamento.latitude || novoEquipamento.longitude) && (
          <div style={styles.coordinatesDisplay}>
            <strong>📍 Coordenadas Selecionadas:</strong><br />
            Latitude: {novoEquipamento.latitude || "Não definida"} | 
            Longitude: {novoEquipamento.longitude || "Não definida"}
          </div>
        )}

        {/* MAPA INTERATIVO */}
        <div 
          style={styles.mapContainer}
          onClick={handleMapClick}
        >
          {/* Imagem de mapa de fundo */}
          <img 
            src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
            alt="Mapa da fazenda"
            style={styles.mapImage}
            onLoad={() => setMapaCarregado(true)}
          />
          
          {/* Overlay com instruções */}
          {showMap && (
            <div style={styles.mapOverlay}>
              <div>
                <div style={{fontSize: "3rem", marginBottom: "10px"}}>📍</div>
                <div>Clique em qualquer lugar do mapa para selecionar a localização</div>
                <div style={{fontSize: "0.9rem", opacity: 0.8, marginTop: "10px"}}>
                  As coordenadas serão automaticamente preenchidas
                </div>
              </div>
            </div>
          )}

          {/* Marcador no mapa */}
          {novoEquipamento.latitude && novoEquipamento.longitude && (
            <>
              <div style={{
                ...styles.mapMarkerPulse,
                left: "50%",
                top: "50%"
              }} />
              <div 
                style={{
                  ...styles.mapMarker,
                  left: "50%",
                  top: "50%"
                }}
                title={`Lat: ${novoEquipamento.latitude}, Lng: ${novoEquipamento.longitude}`}
              />
            </>
          )}

          {/* Mensagem quando não está no modo de seleção */}
          {!showMap && !novoEquipamento.latitude && (
            <div style={styles.mapOverlay}>
              <div>
                <div style={{fontSize: "3rem", marginBottom: "10px"}}>🗺️</div>
                <div>Clique em "Adicionar Equipamento no Mapa" para começar</div>
              </div>
            </div>
          )}
        </div>

        {/* FORMULÁRIO DE CADASTRO */}
        {showMap && (
          <div>
            <div style={styles.mapForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>📝 Nome do Equipamento</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.nome}
                  onChange={(e) => setNovoEquipamento(prev => ({...prev, nome: e.target.value}))}
                  placeholder="Ex: Pluviometro_01"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>📍 Latitude</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.latitude}
                  onChange={(e) => setNovoEquipamento(prev => ({...prev, latitude: e.target.value}))}
                  placeholder="Ex: -14.235004"
                  readOnly
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>📍 Longitude</label>
                <input
                  type="text"
                  style={styles.input}
                  value={novoEquipamento.longitude}
                  onChange={(e) => setNovoEquipamento(prev => ({...prev, longitude: e.target.value}))}
                  placeholder="Ex: -51.925280"
                  readOnly
                />
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button 
                style={styles.primaryButton}
                onClick={handleCadastrarEquipamento}
                disabled={cadastrando || !novoEquipamento.nome}
              >
                {cadastrando ? (
                  <>
                    <div style={{...styles.spinner, width: "16px", height: "16px", marginRight: "8px"}}></div>
                    Cadastrando...
                  </>
                ) : (
                  "💾 Cadastrar Equipamento"
                )}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE EQUIPAMENTOS CADASTRADOS */}
        <div style={styles.equipmentList}>
          <h4 style={{...styles.cardTitle, marginBottom: "15px", fontSize: "1.1rem"}}>
            📋 Equipamentos Cadastrados ({equipamentos.length})
          </h4>
          {equipamentos.length === 0 ? (
            <div style={{textAlign: "center", padding: "20px", color: "#94a3b8"}}>
              Nenhum equipamento cadastrado ainda
            </div>
          ) : (
            equipamentos.map((eqp, index) => (
              <div key={index} style={styles.equipmentItem}>
                <span>📡 {eqp}</span>
                <button 
                  style={{
                    ...styles.secondaryButton,
                    padding: "6px 12px",
                    fontSize: "0.8rem"
                  }}
                  onClick={() => setEquipamento(eqp)}
                >
                  Selecionar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ... (mantenha o resto do código igual) */}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          70% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        
        @media (max-width: 768px) {
          input[type="datetime-local"] {
            font-size: 16px;
          }
        }

        * {
          box-sizing: border-box;
        }

        input:focus, select:focus, button:focus {
          outline: none;
        }

        button:hover {
          transform: translateY(-1px);
        }

        body {
          background: #0f172a;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
