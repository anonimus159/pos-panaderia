import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

export default function ModalCliente({ cliente, onClose, onSaved }) {
  const isEdit = !!cliente;
  const [form, setForm] = useState({
    nombre: cliente?.nombre || '', telefono: cliente?.telefono || '',
    email: cliente?.email || '', notas: cliente?.notas || '',
    nit: cliente?.nit || '', dv: cliente?.dv || '',
    tipoDocumento: cliente?.tipoDocumento || '13',
    tipoPersona: cliente?.tipoPersona || 'Natural',
    regimenFiscal: cliente?.regimenFiscal || '49',
    codPostal: cliente?.codPostal || '',
    municipio: cliente?.municipio || 'Bogotá',
    departamento: cliente?.departamento || 'Cundinamarca',
    responsabilidad: cliente?.responsabilidad || 'R-99-PN',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('basico'); // 'basico' | 'fiscal'
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    try {
      const r = await fetch(isEdit ? `/api/clientes/${cliente.id}` : '/api/clientes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { 
        onSaved(d.cliente); // Enviamos el cliente creado/editado
        onClose(); 
      } else setError(d.message || 'Error');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
      <div className="bg-[#16161A] border border-amber-500/20 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light text-white">{isEdit ? 'Editar' : 'Nuevo'} Cliente</h3>
          <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('basico')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'basico' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400'}`}>DATOS BÁSICOS</button>
          <button onClick={() => setTab('fiscal')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'fiscal' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>INFO FISCAL (DIAN)</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
          {tab === 'basico' ? (
            <div className="space-y-4">
              {[
                { k: 'nombre',   label: 'Nombre completo', placeholder: 'Ej: Juan Pérez o Panadería SAS', required: true },
                { k: 'telefono', label: 'Teléfono',        placeholder: '300 123 4567' },
                { k: 'email',    label: 'Email',            placeholder: 'cliente@email.com', type: 'email' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.k]} onChange={e => set(f.k)(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-700" />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Notas</label>
                <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2} placeholder="Preferencias..."
                  className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 resize-none transition-colors placeholder-gray-700" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">NIT / Cédula</label>
                  <input value={form.nit} onChange={e => set('nit')(e.target.value)} placeholder="123456789"
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">DV</label>
                  <input value={form.dv} onChange={e => set('dv')(e.target.value)} placeholder="0" maxLength="1"
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm text-center focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Tipo Documento</label>
                  <select value={form.tipoDocumento} onChange={e => set('tipoDocumento')(e.target.value)}
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm appearance-none">
                    <option value="13">Cédula de Ciudadanía</option>
                    <option value="31">NIT</option>
                    <option value="22">Cédula de Extranjería</option>
                    <option value="41">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Tipo Persona</label>
                  <select value={form.tipoPersona} onChange={e => set('tipoPersona')(e.target.value)}
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm appearance-none">
                    <option value="Natural">Persona Natural</option>
                    <option value="Juridica">Persona Jurídica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Régimen</label>
                  <select value={form.regimenFiscal} onChange={e => set('regimenFiscal')(e.target.value)}
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm appearance-none">
                    <option value="49">No responsable de IVA</option>
                    <option value="48">Responsable de IVA</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Código Postal</label>
                  <input value={form.codPostal} onChange={e => set('codPostal')(e.target.value)} placeholder="110111"
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Municipio</label>
                  <input value={form.municipio} onChange={e => set('municipio')(e.target.value)} placeholder="Bogotá"
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Departamento</label>
                  <input value={form.departamento} onChange={e => set('departamento')(e.target.value)} placeholder="Cundinamarca"
                    className="w-full bg-[#1E1E26] border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}
          
          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all mt-4 sticky bottom-0">
            <CheckCircle className="w-5 h-5" />{loading ? 'Guardando...' : isEdit ? 'Actualizar Cliente' : 'Crear Cliente'}
          </button>
        </form>
      </div>
    </div>
  );
}
