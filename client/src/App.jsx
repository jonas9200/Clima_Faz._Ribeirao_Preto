import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceArea
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Função para calcular Delta T (do código 1)
const calcularDeltaT = (temp, umid) => {
  if (temp === null || umid === null) return null;
  const t = temp;
  const u = umid;
  const termo1 = t * Math.atan(0.151977 * Math.pow(u + 8.313659, 0.5));
  const termo2 = Math.atan(t + u);
  const termo3 = Math.atan(u - 1.676331);
  const termo4 = 0.00391838 * Math.pow(u, 1.5) * Math.atan(0.023101 * u);
  const resultado = t - ((termo1 + termo2) - termo3 + termo4 - 4.686035);
  return parseFloat(resultado.toFixed(2));
};

export default function App() {
  const [dados, setDados] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipamento, setEquipamento] = useState("");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [totalChuva, setTotalChuva] = useState(0);
  const [previsao, setPrevisao] = useState([]);
  const [janelasIdeais, setJanelasIdeais] = useState([]);
  const dashboardRef = useRef();

  const baseUrl = import.meta.env.VITE_API_URL || "";

  // Formatadores de data
  function toLocalDatetimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toDatabaseFormat(datetimeString) {
    if (!datetimeString) return '';
    const date = new Date(datetimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
  }

  // 🔄 Carregar lista de equipamentos
  useEffect(() => {
    carregarEquipamentos();
    
    // Inicializar datas (últimas 24h)
    const agora = new Date();
    const inicio = new Date(agora.getTime() - 86400000);
    setFiltroInicio(toLocalDatetimeString(inicio));
    setFiltroFim(toLocalDatetimeString(agora));
    
    // Carregar previsão do tempo (exemplo estático - substituir por API real se necessário)
    const previsaoExemplo = [
      { data: "Seg 25", max: 28, min: 18, probChuva: 30 },
      { data: "Ter 26", max: 27, min: 17, probChuva: 10 },
      { data: "Qua 27", max: 29, min: 19, probChuva: 5 },
      { data: "Qui 28", max: 30, min: 20, probChuva: 20 },
      { data: "Sex 29", max: 31, min: 21, probChuva: 40 },
      { data: "Sáb 30", max: 29, min: 20, probChuva: 60 },
      { data: "Dom 31", max: 28, min: 19, probChuva: 25 }
    ];
    setPrevisao(previsaoExemplo);
    
    // Exemplo de janelas ideais
    setJanelasIdeais([
      { dia: "25 Fev", hora: "06:00", deltaT: 3.5 },
      { dia: "26 Fev", hora: "07:00", deltaT: 4.2 },
      { dia: "27 Fev", hora: "05:30", deltaT: 3.8 },
      { dia: "28 Fev", hora: "06:30", deltaT: 4.5 },
      { dia: "29 Fev", hora: "07:00", deltaT: 3.9 }
    ]);
  }, []);

  async function carregarEquipamentos() {
    try {
      const url = `${baseUrl}/api/equipamentos`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro ao buscar equipamentos");
      const json = await resp.json();
      const listaEquipamentos = json.equipamentos || ["Pluviometro_01"];
      setEquipamentos(listaEquipamentos);
      if (listaEquipamentos.length > 0 && !equipamento) {
        setEquipamento(listaEquipamentos[0]);
      }
    } catch (e) {
      console.error("Erro ao carregar equipamentos:", e);
      const listaPadrao = ["Pluviometro_01"];
      setEquipamentos(listaPadrao);
      setEquipamento(listaPadrao[0]);
    }
  }

  // 🔄 Carregar dados quando equipamento ou datas mudarem
  useEffect(() => {
    if (equipamento && filtroInicio && filtroFim) {
      carregarDados();
    }
  }, [equipamento, filtroInicio, filtroFim]);

  async function carregarDados() {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams({ 
        equipamento,
        data_inicial: toDatabaseFormat(filtroInicio),
        data_final: toDatabaseFormat(filtroFim)
      });

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

  // Processar dados para o formato do gráfico (similar ao código 1)
  const dadosProcessados = useMemo(() => {
    if (!dados.length) return [];
    
    // Agrupar por hora para melhor visualização
    const mapaPorHora = {};
    
    dados.forEach((item) => {
      const dataRegistro = new Date(item.registro);
      const horaKey = dataRegistro.toISOString().slice(0, 13); // Agrupa por hora
      
      if (!mapaPorHora[horaKey]) {
        mapaPorHora[horaKey] = {
          timestamp: dataRegistro.getTime(),
          hora: dataRegistro.getHours().toString().padStart(2, '0') + ':00',
          tempSoma: 0,
          umidSoma: 0,
          chuvaSoma: 0,
          contagem: 0
        };
      }
      
      mapaPorHora[horaKey].tempSoma += Number(item.temperatura) || 0;
      mapaPorHora[horaKey].umidSoma += Number(item.umidade) || 0;
      mapaPorHora[horaKey].chuvaSoma += Number(item.chuva) || 0;
      mapaPorHora[horaKey].contagem++;
    });

    // Converter para array e calcular médias
    const resultado = Object.values(mapaPorHora)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({
        timestamp: item.timestamp,
        hora: item.hora,
        temp: item.contagem > 0 ? Number((item.tempSoma / item.contagem).toFixed(2)) : 0,
        umid: item.contagem > 0 ? Number((item.umidSoma / item.contagem).toFixed(2)) : 0,
        chuva: Number(item.chuvaSoma.toFixed(2)),
        deltaT: calcularDeltaT(
          item.contagem > 0 ? (item.tempSoma / item.contagem) : 0,
          item.contagem > 0 ? (item.umidSoma / item.contagem) : 0
        )
      }));

    return resultado;
  }, [dados]);

  // Funções de filtro rápido
  const aplicarFiltroRapido = (periodo) => {
    const agora = new Date();
    const inicio = new Date();

    if (periodo === "24h") {
      inicio.setHours(inicio.getHours() - 24);
    } else if (periodo === "7d") {
      inicio.setDate(inicio.getDate() - 7);
    } else if (periodo === "30d") {
      inicio.setDate(inicio.getDate() - 30);
    }

    setFiltroInicio(toLocalDatetimeString(inicio));
    setFiltroFim(toLocalDatetimeString(agora));
  };

  // Funções de exportação (do código 1)
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dadosProcessados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Estação");
    XLSX.writeFile(wb, "Relatorio_FazendaRP.xlsx");
  };

  const exportarPDF = async () => {
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#0f172a' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save("Dashboard_FazendaRP.pdf");
  };

  // Dados do último registro
  const ultimoDado = dadosProcessados.length > 0 ? dadosProcessados[dadosProcessados.length - 1] : null;

  // Estilos (do código 1)
  const inputStyle = { 
    background: '#0f172a', 
    border: '1px solid #334155', 
    color: 'white', 
    padding: '8px', 
    borderRadius: '6px', 
    fontSize: '12px' 
  };

  const btnStyle = { 
    background: '#334155', 
    color: 'white', 
    border: 'none', 
    padding: '10px 15px', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '12px', 
    fontWeight: 'bold' 
  };

  return (
    <div style={{ width: '100%', padding: '20px', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <div ref={dashboardRef} style={{ padding: '10px' }}>
        
        {/* CABEÇALHO */}
        <header style={{ maxWidth: '1100px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ background: 'white', padding: '5px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', color: '#3b82f6' }}>🌦️</div>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>Fazenda Ribeirão Preto</h1>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>Estação Meteorológica - Perdizes/MG</p>
          </div>
          <select 
            value={equipamento} 
            onChange={(e) => setEquipamento(e.target.value)} 
            style={{ 
              marginLeft: 'auto', 
              background: '#0f172a', 
              color: 'white', 
              border: '1px solid #334155', 
              padding: '8px', 
              borderRadius: '6px',
              minWidth: '150px'
            }}
          >
            {equipamentos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </header>

        {/* CARDS RESUMO */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <Card title="Última Comunicação" value={ultimoDado?.hora || '--'} />
          <Card title="Temperatura Atual" value={`${ultimoDado?.temp || '--'}°C`} color="#ef4444" />
          <Card title="Umidade Atual" value={`${ultimoDado?.umid || '--'}%`} color="#10b981" />
          <Card title="Chuva no Período" value={`${totalChuva.toFixed(1)}mm`} color="#3b82f6" />
        </div>

        {/* FILTROS E EXPORTAÇÃO */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="datetime-local" 
                value={filtroInicio} 
                onChange={(e) => setFiltroInicio(e.target.value)} 
                style={inputStyle} 
              />
              <input 
                type="datetime-local" 
                value={filtroFim} 
                onChange={(e) => setFiltroFim(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => aplicarFiltroRapido("24h")} style={btnStyle}>24h</button>
              <button onClick={() => aplicarFiltroRapido("7d")} style={btnStyle}>7 Dias</button>
              <button onClick={() => aplicarFiltroRapido("30d")} style={btnStyle}>30 Dias</button>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button onClick={exportarExcel} style={{ ...btnStyle, background: '#10b981' }}>📊 Excel</button>
              <button onClick={exportarPDF} style={{ ...btnStyle, background: '#3b82f6' }}>📥 PDF</button>
            </div>
          </div>
        </div>

        {/* MENSAGEM DE ERRO OU CARREGAMENTO */}
        {erro && (
          <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', padding: '15px', background: '#7f1d1d', color: '#fca5a5', borderRadius: '8px' }}>
            ⚠️ {erro}
          </div>
        )}

        {loading && (
          <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Carregando dados...
          </div>
        )}

        {/* GRÁFICO PRINCIPAL */}
        {dadosProcessados.length > 0 && !loading && (
          <>
            <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', borderLeft: '4px solid #3b82f6', paddingLeft: '15px' }}>Monitoramento Meteorológico Local</h2>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dadosProcessados}>
                    <CartesianGrid stroke="#334155" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" width={80} label={{ value: '°C / % Umidade', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" width={80} label={{ value: 'Chuva (mm)', angle: -90, position: 'insideRight', style: { fill: '#3b82f6' } }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="right" dataKey="chuva" name="Chuva" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp Méd" stroke="#ef4444" strokeWidth={3} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="umid" name="Umid Méd" stroke="#10b981" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SEÇÃO DE PREVISÃO E JANELAS */}
            <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', padding: '20px', borderRadius: '16px', border: '2px solid #334155', background: 'rgba(30, 41, 59, 0.5)' }}>
              <h2 style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '15px' }}>Previsão Climática e Recomendações</h2>
              
              {/* Janelas Ideais */}
              <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid #10b981' }}>
                <h3 style={{ fontSize: '12px', color: '#10b981', margin: '0 0 10px 0' }}>✅ Próximas Janelas Ideais para Pulverização (Previsão)</h3>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                  {janelasIdeais.map((j, i) => (
                    <div key={i} style={{ minWidth: '105px', background: '#1e293b', padding: '10px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{j.dia}</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>{j.hora}</span>
                      <span style={{ fontSize: '11px', color: '#10b981' }}>ΔT: {j.deltaT}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cards de 7 Dias */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {previsao.map((p, i) => (
                  <div key={i} style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>{p.data}</span>
                    <div style={{ margin: '5px 0', fontSize: '13px' }}>{p.max}°|{p.min}°</div>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>💧{p.probChuva}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* GRÁFICO DELTA T */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', borderLeft: '4px solid #facc15', paddingLeft: '15px' }}>Janela para aplicação (Delta T)</h2>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosProcessados}>
                    <CartesianGrid stroke="#334155" vertical={false} />
                    <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" domain={[0, 15]} width={40} />
                    <ReferenceArea y1={0} y2={2} fill="#facc15" fillOpacity={0.2} label={{ value: 'Atenção', fill: '#facc15', fontSize: 10 }} />
                    <ReferenceArea y1={2} y2={8} fill="#10b981" fillOpacity={0.2} label={{ value: 'Ideal', fill: '#10b981', fontSize: 10 }} />
                    <ReferenceArea y1={8} y2={10} fill="#facc15" fillOpacity={0.2} />
                    <ReferenceArea y1={10} y2={15} fill="#ef4444" fillOpacity={0.2} label={{ value: 'Perigo', fill: '#ef4444', fontSize: 10 }} />
                    <Area type="monotone" dataKey="deltaT" stroke="#f8fafc" strokeWidth={3} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* MENSAGEM SEM DADOS */}
        {!loading && dadosProcessados.length === 0 && equipamento && !erro && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#1e293b', padding: '40px', borderRadius: '16px', border: '1px solid #334155', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📈</div>
            <h3 style={{ color: '#e2e8f0' }}>Nenhum dado encontrado</h3>
            <p>Não há dados disponíveis para o período selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Card (do código 1)
const Card = ({ title, value, color }) => (
  <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
    <p style={{ margin: 0, color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>{title}</p>
    <h3 style={{ margin: '5px 0 0 0', fontSize: '18px', color: color || 'white' }}>{value || '--'}</h3>
  </div>
);
