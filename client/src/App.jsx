import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceArea
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Endereço do seu servidor local (Mudar para o link do Render ao enviar para o dev)
const API_URL = "https://clima-faz-ribeirao-preto-api.onrender.com";

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

function App() {
  const [dataFull, setDataFull] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [equipSelecionado, setEquipSelecionado] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [previsao, setPrevisao] = useState([]); 
  const [janelasIdeais, setJanelasIdeais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const dashboardRef = useRef();

  const [visivel, setVisivel] = useState({ chuva: true, tempMed: true, umidMed: true });

  // --- 1. INICIALIZAÇÃO ---
  useEffect(() => {
    const agora = new Date();
    setFiltroInicio(new Date(agora.getTime() - 86400000).toISOString());
    setFiltroFim(agora.toISOString());

    fetch(`${API_URL}/equipamentos`)
      .then(res => res.json())
      .then(data => {
        if (data?.equipamentos?.length > 0) {
          setEquipamentos(data.equipamentos);
          setEquipSelecionado(data.equipamentos[0]);
        }
      }).catch(err => console.error("Erro equipamentos:", err));

    const lat = -19.549781; const lon = -47.227682;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo`)
      .then(res => res.json())
      .then(data => {
        const dias = data.daily.time.map((time, index) => ({
          data: new Date(time).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          max: data.daily.temperature_2m_max[index],
          min: data.daily.temperature_2m_min[index],
          probChuva: data.daily.precipitation_probability_max[index]
        }));
        setPrevisao(dias);

        const recomendacoes = [];
        data.hourly.time.forEach((time, index) => {
          const dt = calcularDeltaT(data.hourly.temperature_2m[index], data.hourly.relative_humidity_2m[index]);
          if (dt >= 2 && dt <= 8 && recomendacoes.length < 5 && new Date(time) > new Date()) {
            recomendacoes.push({ dia: new Date(time).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }), hora: new Date(time).getHours() + ':00', deltaT: dt });
          }
        });
        setJanelasIdeais(recomendacoes);
      });
  }, []);

  // --- 2. BUSCA DE DADOS REAIS ---
  useEffect(() => {
    if (!equipSelecionado) return;
    setCarregando(true);
    const params = new URLSearchParams({ equipamento: equipSelecionado, data_inicial: filtroInicio, data_final: filtroFim });

    fetch(`${API_URL}/series?${params}`)
      .then(res => res.json())
      .then(resBanco => {
        if (resBanco?.dados) {
          const formatado = resBanco.dados.map(item => ({
            timestamp: new Date(item.registro).getTime(),
            hora: new Date(item.registro).getHours().toString().padStart(2, '0') + ':00',
            temp: Number(item.temperatura) || 0,
            umid: Number(item.umidade) || 0,
            chuva: Number(item.chuva) || 0,
            deltaT: calcularDeltaT(Number(item.temperatura), Number(item.umidade))
          }));
          setDataFull(formatado);
        }
        setCarregando(false);
      }).catch(() => setCarregando(false));
  }, [equipSelecionado, filtroInicio, filtroFim]);

  const { dadosGrafico, somaChuvaTotal, ultimoDado } = useMemo(() => {
    if (dataFull.length === 0) return { dadosGrafico: [], somaChuvaTotal: 0 };
    return { dadosGrafico: dataFull, somaChuvaTotal: dataFull.reduce((acc, curr) => acc + curr.chuva, 0), ultimoDado: dataFull[dataFull.length - 1] };
  }, [dataFull]);

  // --- 3. EXPORTAÇÕES ---
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dataFull);
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

  return (
    <div style={{ width: '100%', padding: '20px', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <div ref={dashboardRef} style={{ padding: '10px' }}>
        
        {/* CABEÇALHO */}
        <header style={{ maxWidth: '1100px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ background: 'white', padding: '5px', borderRadius: '8px' }}>
            <img src="/logo-frp.png" alt="Logo" style={{ height: '50px' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>Fazenda Ribeirão Preto</h1>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>Estação Meteorológica - Perdizes/MG</p>
          </div>
          <select value={equipSelecionado} onChange={(e) => setEquipSelecionado(e.target.value)} style={{ marginLeft: 'auto', background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '8px', borderRadius: '6px' }}>
            {equipamentos.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </header>

        {/* CARDS RESUMO */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <Card title="Última Comunicação" value={ultimoDado?.hora} />
          <Card title="Temperatura Atual" value={`${ultimoDado?.temp || '--'}°C`} color="#ef4444" />
          <Card title="Umidade Atual" value={`${ultimoDado?.umid || '--'}%`} color="#10b981" />
          <Card title="Chuva no Período" value={`${somaChuvaTotal.toFixed(1)}mm`} color="#3b82f6" />
        </div>

        {/* FILTROS E EXPORTAÇÃO (RESTAURADOS) */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="date" value={filtroInicio.split('T')[0]} onChange={(e) => setFiltroInicio(new Date(e.target.value).toISOString())} style={inputStyle} />
              <input type="date" value={filtroFim.split('T')[0]} onChange={(e) => setFiltroFim(new Date(e.target.value).toISOString())} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const a = new Date(); setFiltroInicio(new Date(a.getTime() - 86400000).toISOString()); setFiltroFim(a.toISOString()); }} style={btnStyle}>24h</button>
              <button onClick={() => { const a = new Date(); setFiltroInicio(new Date(a.getTime() - 604800000).toISOString()); setFiltroFim(a.toISOString()); }} style={btnStyle}>7 Dias</button>
              <button onClick={() => { const a = new Date(); setFiltroInicio(new Date(a.getTime() - 2592000000).toISOString()); setFiltroFim(a.toISOString()); }} style={btnStyle}>30 Dias</button>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button onClick={exportarExcel} style={{ ...btnStyle, background: '#10b981' }}>📊 Excel</button>
              <button onClick={exportarPDF} style={{ ...btnStyle, background: '#3b82f6' }}>📥 PDF</button>
            </div>
          </div>
        </div>

        {/* GRÁFICO PRINCIPAL COM TÍTULOS NOS EIXOS */}
        <div style={{ maxWidth: '1100px', margin: '0 auto 25px auto', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', borderLeft: '4px solid #3b82f6', paddingLeft: '15px' }}>Monitoramento Meteorológico Local</h2>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico}>
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

        {/* SEÇÃO DE PREVISÃO E JANELAS (RESTABELECIDA COMPLETA) */}
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

        {/* GRÁFICO DELTA T COM CORES DE ZONA (RESTAURADO) */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', borderLeft: '4px solid #facc15', paddingLeft: '15px' }}>Janela para aplicação (Delta T)</h2>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico}>
                <CartesianGrid stroke="#334155" vertical={false} />
                <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" domain={[0, 15]} width={40} />
                {/* Zonas Coloridas Restauradas */}
                <ReferenceArea y1={0} y2={2} fill="#facc15" fillOpacity={0.2} label={{ value: 'Atenção', fill: '#facc15', fontSize: 10 }} />
                <ReferenceArea y1={2} y2={8} fill="#10b981" fillOpacity={0.2} label={{ value: 'Ideal', fill: '#10b981', fontSize: 10 }} />
                <ReferenceArea y1={8} y2={10} fill="#facc15" fillOpacity={0.2} />
                <ReferenceArea y1={10} y2={15} fill="#ef4444" fillOpacity={0.2} label={{ value: 'Perigo', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="deltaT" stroke="#f8fafc" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

const Card = ({ title, value, color }) => (
  <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
    <p style={{ margin: 0, color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>{title}</p>
    <h3 style={{ margin: '5px 0 0 0', fontSize: '18px', color: color || 'white' }}>{value || '--'}</h3>
  </div>
);

const inputStyle = { background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '6px', fontSize: '12px' };
const btnStyle = { background: '#334155', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

export default App;
