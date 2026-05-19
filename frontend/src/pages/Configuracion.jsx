import React, { useState, useEffect } from 'react';
import {
  Save, Download, Store, Phone, MapPin, Hash, FileText, Tag,
  CheckCircle, Database, Printer, Wifi, AlertTriangle, Monitor,
  Bell, BellOff, RefreshCw, Layers, Clock, ShieldCheck
} from 'lucide-react';

const Field = ({ label, icon: Icon, value, onChange, onBlur, placeholder, type = 'text', hint }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-700 shadow-inner"
    />
    {hint && <p className="text-[10px] text-gray-600 italic px-1">{hint}</p>}
  </div>
);

const Toggle = ({ label, icon: Icon, value, onChange, description }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${value ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-500/10 text-gray-500'}`}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <div>
        <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{label}</p>
        {description && <p className="text-[10px] text-gray-500">{description}</p>}
      </div>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${value ? 'bg-amber-500' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${value ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

const Section = ({ title, subtitle, children, accent = 'amber' }) => {
  const accents = {
    amber: 'border-amber-500/20',
    blue:  'border-blue-500/20',
    green: 'border-emerald-500/20',
  };
  return (
    <div className={`bg-[#14141A] border ${accents[accent] || accents.amber} rounded-3xl p-6 space-y-5`}>
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-white font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};

export default function Configuracion() {
  const [cfg, setCfg]         = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [testPrint, setTestPrint] = useState({ loading: false, msg: '', ok: null });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      if (d.success) setCfg(d.config);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (key) => (val) => {
    setCfg(prev => {
      const newCfg = { ...prev, [key]: val };
      autoSave(newCfg);
      return newCfg;
    });
  };



  const save = async (currentCfg = cfg) => {
    setSaving(true);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCfg)
      });
      const d = await r.json();
      if (d.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const autoSave = (currentCfg) => {
    fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentCfg)
    }).catch(e => console.error("Error auto-guardando:", e));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const d = await r.json();
      if (d.success) {
        setCfg(prev => {
          const newCfg = { ...prev, [key]: d.url };
          // Guardar automáticamente tras subir archivo
          fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCfg)
          }).catch(e => console.error("Error auto-guardando:", e));
          return newCfg;
        });
      }
    } catch (e) { console.error(e); }
  };

  const backup = () => window.open('/api/backup', '_blank');

  const testPrinter = async () => {
    setTestPrint({ loading: true, msg: '', ok: null });
    try {
      const r = await fetch('/api/print/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: 'Prueba de impresión', quantity: 1, subtotal: 0 }],
          total: 0, orderNumber: 'TEST',
          tableName: 'PRUEBA'
        })
      });
      const d = await r.json();
      setTestPrint({ loading: false, msg: d.message || (d.success ? 'Impresora OK' : 'Error'), ok: d.success });
    } catch (e) {
      setTestPrint({ loading: false, msg: 'Error de conexión con el servidor', ok: false });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-full">
      <div className="absolute top-0 right-0 w-1/3 h-48 bg-amber-500/5 blur-[100px] pointer-events-none" />

      <header className="flex items-center justify-between relative z-10 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-light text-white">
            Configuración del <span className="font-bold text-amber-400">Negocio</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">Datos del negocio, tickets e impresora térmica</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={backup}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all">
            <Database className="w-4 h-4" /> Backup DB
          </button>
          <button onClick={save} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              saved   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              saving  ? 'bg-amber-500/20 text-amber-300 cursor-wait' :
                        'bg-amber-500 hover:bg-amber-400 text-black'
            }`}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Guardado</> :
             saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar cambios</>}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        {/* Datos del negocio */}
        <Section title="Datos del Negocio" subtitle="Se imprimen en todos los tickets y reportes">
          <Field label="Nombre del negocio" icon={Store}   value={cfg['negocio.nombre']    || ''} onChange={set('negocio.nombre')}    placeholder="Panadería San José" />
          <Field label="Dirección"           icon={MapPin}  value={cfg['negocio.direccion'] || ''} onChange={set('negocio.direccion')} placeholder="Calle Principal 123, Ciudad" />
          <Field label="Teléfono"            icon={Phone}   value={cfg['negocio.telefono']  || ''} onChange={set('negocio.telefono')}  placeholder="(55) 1234-5678" />
          <Field label="NIT / Documento"     icon={Hash}    value={cfg['negocio.rfc']       || ''} onChange={set('negocio.rfc')}       placeholder="123.456.789-0" />
          <Field label="Slogan / Lema"       icon={Tag}     value={cfg['negocio.slogan']    || ''} onChange={set('negocio.slogan')}    placeholder="El sabor de siempre..." />
        </Section>

        <div className="space-y-6">
          {/* Configuración de tickets */}
          <Section title="Configuración de Tickets" subtitle="Texto que aparece en los recibos impresos">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Pie de ticket
              </label>
              <textarea
                value={cfg['ticket.footer'] || ''}
                onChange={e => set('ticket.footer')(e.target.value)}
                onBlur={autoSave}
                placeholder="Gracias por su preferencia"
                rows={3}
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder-gray-700"
              />
            </div>
            <Field label="IVA %" icon={Hash} type="number" value={cfg['ticket.iva'] || '0'} onChange={set('ticket.iva')} placeholder="16" />
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Texto Legal / Resolución
              </label>
              <textarea
                value={cfg['ticket.legal'] || ''}
                onChange={e => set('ticket.legal')(e.target.value)}
                placeholder="Ej: Resolución DIAN No. 123... Régimen Simplificado"
                rows={2}
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder-gray-700 shadow-inner"
              />
              <p className="text-[10px] text-gray-600 mt-1 italic">Aparece al final del ticket, después del agradecimiento.</p>
            </div>
          </Section>

          {/* Vista previa */}
          <Section title="Vista Previa del Ticket" subtitle="Así se verá el encabezado del recibo">
            <div className="bg-white text-black font-mono text-[11px] p-4 rounded-2xl leading-relaxed">
              <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                <p className="font-bold text-base">{cfg['negocio.nombre'] || 'POS Bakery'}</p>
                {cfg['negocio.direccion'] && <p className="text-gray-600">{cfg['negocio.direccion']}</p>}
                {cfg['negocio.telefono']  && <p className="text-gray-600">Tel: {cfg['negocio.telefono']}</p>}
                {cfg['negocio.rfc']       && <p className="text-gray-600">NIT: {cfg['negocio.rfc']}</p>}
                {cfg['negocio.slogan']    && <p className="italic text-gray-500 text-[10px] mt-1">{cfg['negocio.slogan']}</p>}
              </div>
              <div className="flex justify-between text-gray-500 text-[10px] mb-2">
                <span>{new Date().toLocaleDateString('es-MX')}</span>
                <span>{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                <div className="flex justify-between"><span>1x Croissant</span><span>$25.00</span></div>
                <div className="flex justify-between"><span>2x Pan dulce</span><span>$30.00</span></div>
              </div>
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>$55.00</span></div>
              <div className="text-center border-t border-dashed border-gray-400 pt-3 mt-3 text-gray-500">
                {cfg['ticket.footer'] || 'Gracias por su preferencia'}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Impresora Térmica */}
      <div className="relative z-10">
        <Section title="🖨️ Impresora Térmica" subtitle="Configura la impresora USB conectada a Windows" accent="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> Nombre de la impresora en Windows
              </label>
              <input
                value={cfg['printer.nombre'] || ''}
                onChange={e => set('printer.nombre')(e.target.value)}
                onBlur={autoSave}
                placeholder="Ej: POS-80 Thermal Printer"
                className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder-gray-700"
              />
              <p className="text-xs text-gray-600 mt-2">
                Abre <span className="text-gray-400 font-mono">Panel de control → Dispositivos e impresoras</span> y copia el nombre exacto de tu impresora.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Protocolo de impresora
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['EPSON', 'STAR'].map(tipo => (
                  <button key={tipo} type="button" onClick={() => set('printer.tipo')(tipo)}
                    className={`py-3 rounded-2xl text-sm font-medium border transition-all ${cfg['printer.tipo'] === tipo || (!cfg['printer.tipo'] && tipo === 'EPSON') ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {tipo} {tipo === 'EPSON' ? '(más común)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button onClick={testPrinter} disabled={testPrint.loading || !cfg['printer.nombre']}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 disabled:opacity-40 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all">
              <Printer className="w-4 h-4" />
              {testPrint.loading ? 'Enviando prueba...' : 'Imprimir Ticket de Prueba'}
            </button>
            {testPrint.msg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border ${testPrint.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {testPrint.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {testPrint.msg}
              </div>
            )}
          </div>

          <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4">
            <p className="text-xs text-blue-300 font-bold mb-2 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Instrucciones de configuración</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Conecta tu impresora térmica por USB a Windows</li>
              <li>Instala el driver con el nombre <strong className="text-gray-300">"Generic / Text Only"</strong> para mejor compatibilidad</li>
              <li>Ve a <span className="text-gray-300">Panel de Control → Dispositivos e impresoras</span>, copia el nombre exacto</li>
              <li>Pega el nombre arriba y guarda. Luego prueba la impresión</li>
              <li>Si usas impresora de marca Epson usa protocolo EPSON, si es Star Micronics usa STAR</li>
            </ol>
          </div>
        </Section>
      </div>

      {/* Pagos Electrónicos */}
      <div className="relative z-10">
        <Section title="📱 Pagos Electrónicos" subtitle="Configura tus cuentas de Nequi y Daviplata para recibir pagos" accent="green">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Nequi */}
            <div className="space-y-4 p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#700AD4] rounded-2xl flex items-center justify-center text-white font-bold text-xl">N</div>
                <h4 className="text-white font-semibold">Configuración Nequi</h4>
              </div>
              <Field label="Número de Celular / Cuenta" icon={Phone} value={cfg['payments.nequi.phone'] || ''} onChange={set('payments.nequi.phone')} onBlur={autoSave} placeholder="300 123 4567" />
              <Field label="URL o Ruta del QR Estático" icon={FileText} value={cfg['payments.nequi.qr'] || ''} onChange={set('payments.nequi.qr')} placeholder="/qrs/nequi.png" />
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">Subir nueva imagen QR</label>
                <input type="file" accept="image/*" onChange={e => handleFileUpload('payments.nequi.qr', e.target.files[0])}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer" />
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center min-h-[120px]">
                {cfg['payments.nequi.qr'] ? (
                  <img src={cfg['payments.nequi.qr']} alt="QR Nequi" className="max-h-24 object-contain" />
                ) : (
                  <p className="text-xs text-gray-500 italic text-center">Selecciona un archivo arriba para cargar tu código QR</p>
                )}
              </div>
            </div>

            {/* Daviplata */}
            <div className="space-y-4 p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#E30613] rounded-2xl flex items-center justify-center text-white font-bold text-xl">D</div>
                <h4 className="text-white font-semibold">Configuración Daviplata</h4>
              </div>
              <Field label="Número de Celular / Cuenta" icon={Phone} value={cfg['payments.daviplata.phone'] || ''} onChange={set('payments.daviplata.phone')} onBlur={autoSave} placeholder="300 123 4567" />
              <Field label="URL o Ruta del QR Estático" icon={FileText} value={cfg['payments.daviplata.qr'] || ''} onChange={set('payments.daviplata.qr')} placeholder="/qrs/daviplata.png" />
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">Subir nueva imagen QR</label>
                <input type="file" accept="image/*" onChange={e => handleFileUpload('payments.daviplata.qr', e.target.files[0])}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer" />
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center min-h-[120px]">
                {cfg['payments.daviplata.qr'] ? (
                  <img src={cfg['payments.daviplata.qr']} alt="QR Daviplata" className="max-h-24 object-contain" />
                ) : (
                  <p className="text-xs text-gray-500 italic text-center">Selecciona un archivo arriba para cargar tu código QR</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 mt-4">
            <p className="text-xs text-emerald-300 font-bold mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Importante</p>
            <p className="text-xs text-gray-400">
              Estos datos se usarán para mostrar un QR al cliente durante el cobro. El cajero debe verificar manualmente que la transferencia haya llegado antes de confirmar el pago en el sistema.
            </p>
          </div>
        </Section>
      </div>

      {/* Reglas de Operación */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
        <Section title="⚡ Reglas de Operación" subtitle="Automatiza procesos para ser más rápido" accent="amber">
          <Toggle 
            label="Auto-liberar Mesa" 
            icon={RefreshCw} 
            value={cfg['ops.autoFreeTable'] === 'true'} 
            onChange={(v) => set('ops.autoFreeTable')(String(v))}
            description="La mesa pasa a Disponible inmediatamente tras pagar"
          />
          <Toggle 
            label="Sonido en Cocina" 
            icon={cfg['ui.alertSound'] === 'false' ? BellOff : Bell} 
            value={cfg['ui.alertSound'] !== 'false'} 
            onChange={(v) => set('ui.alertSound')(String(v))}
            description="Activar alerta sonora para nuevas comandas"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field 
              label="Corte Diario (Hora)" 
              icon={Clock} 
              type="number" 
              value={cfg['ops.cutOffHour'] || '23'} 
              onChange={set('ops.cutOffHour')} 
              hint="Hora en la que termina el día (0-23)"
            />
            <Field 
              label="Propina Sugerida (%)" 
              icon={Tag} 
              type="number" 
              value={cfg['ops.suggestedTip'] || '10'} 
              onChange={set('ops.suggestedTip')} 
              hint="Se muestra en el ticket impreso"
            />
          </div>
        </Section>

        <Section title="📈 Alertas e Inventario" subtitle="Mantén el control de tus insumos" accent="blue">
          <Field 
            label="Umbral de Stock Bajo" 
            icon={Layers} 
            type="number" 
            value={cfg['ops.lowStockThreshold'] || '5'} 
            onChange={set('ops.lowStockThreshold')} 
            hint="Avisar cuando queden menos de esta cantidad"
          />
          <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-blue-400" />
              <h4 className="text-white text-sm font-bold">Optimización de Stock</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              El sistema resaltará en el POS y en la lista de productos aquellos ítems que estén por debajo del umbral configurado, permitiendo reposiciones preventivas.
            </p>
          </div>
        </Section>
      </div>

      {/* Metas de Ventas */}
      <div className="relative z-10 mt-6">
        <MetaManager />
      </div>
    </div>
  );
}

function MetaManager() {
  const [mes, setMes]   = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [meta, setMeta] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState({ msg: '', ok: null });

  useEffect(() => {
    loadMeta();
  }, [mes, anio]);

  const loadMeta = async () => {
    try {
      const r = await fetch('/api/metas');
      const d = await r.json();
      if (d.success) {
        const found = d.metas.find(m => m.mes === parseInt(mes) && m.anio === parseInt(anio));
        setMeta(found ? found.meta : '');
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus({ msg: '', ok: null });
    try {
      const r = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, anio, meta: parseFloat(meta || 0) })
      });
      const d = await r.json();
      setStatus({ msg: d.success ? 'Meta guardada' : 'Error', ok: d.success });
      if (d.success) setTimeout(() => setStatus({ msg: '', ok: null }), 3000);
    } catch (e) { setStatus({ msg: 'Error de conexión', ok: false }); }
    finally { setLoading(false); }
  };

  return (
    <Section title="🎯 Metas de Ventas Mensuales" subtitle="Establece objetivos para el Dashboard" accent="green">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)}
            className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none min-w-[140px]">
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)}
            className="bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none min-w-[100px]">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Meta de ventas ($)</label>
          <input type="number" value={meta} onChange={e => setMeta(e.target.value)} placeholder="0.00"
            className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <button onClick={handleSave} disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-2xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          {loading ? '...' : 'Guardar Meta'}
        </button>
      </div>
      {status.msg && (
        <p className={`text-xs font-bold ${status.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{status.msg}</p>
      )}
    </Section>
  );
}
