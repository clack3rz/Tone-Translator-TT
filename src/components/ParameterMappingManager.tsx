import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Database, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Trash2,
  Plus,
  Save,
  FileJson,
  CheckCircle2,
  Info
} from 'lucide-react';
import { ParameterMapping } from '../types';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { auth, signInWithGoogle } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export const ParameterMappingManager: React.FC = () => {
  const [mappings, setMappings] = useState<ParameterMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<ParameterMapping, 'id'>>({
    gearName: '',
    parameter: '',
    visualMin: 0,
    visualMax: 10,
    visualUnit: '',
    exportMin: 0,
    exportMax: 10,
    exportParameterName: '',
    conversion: 'direct',
    formula: ''
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteConfId, setDeleteConfId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      const data = await at5DatabaseService.getParameterMappings();
      setMappings(data);
    } catch (err) {
      console.error('Error loading parameter mappings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }

    if (!form.gearName || !form.parameter || !form.exportParameterName) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setIsLoading(true);
    try {
      await at5DatabaseService.saveParameterMapping({
        ...form,
        visualMin: Number(form.visualMin),
        visualMax: Number(form.visualMax),
        exportMin: Number(form.exportMin),
        exportMax: Number(form.exportMax)
      });
      setFeedback({ type: 'success', message: `Saved mapping for ${form.gearName} - ${form.parameter}` });
      setIsAdding(false);
      // Reset form
      setForm({
        gearName: '',
        parameter: '',
        visualMin: 0,
        visualMax: 10,
        visualUnit: '',
        exportMin: 0,
        exportMax: 10,
        exportParameterName: '',
        conversion: 'direct',
        formula: ''
      });
      await loadMappings();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save mapping.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setIsLoading(true);
    try {
      await at5DatabaseService.deleteParameterMapping(id);
      setFeedback({ type: 'success', message: 'Mapping deleted successfully.' });
      setDeleteConfId(null);
      await loadMappings();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to delete mapping.' });
    } finally {
      setIsLoading(false);
    }
  };

  const seedSampleNoiseGate = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setIsLoading(true);
    try {
      // Threshold
      await at5DatabaseService.saveParameterMapping({
        gearName: "Noise Gate",
        parameter: "Threshold",
        visualMin: -100,
        visualMax: 0,
        visualUnit: "dB",
        exportMin: 0.00001,
        exportMax: 1,
        exportParameterName: "Threshold",
        conversion: "db_to_linear",
        formula: "10^(dB/20)"
      });
      // Release
      await at5DatabaseService.saveParameterMapping({
        gearName: "Noise Gate",
        parameter: "Release",
        visualMin: 20,
        visualMax: 1500,
        visualUnit: "ms",
        exportMin: 20,
        exportMax: 1500,
        exportParameterName: "Release",
        conversion: "direct"
      });
      // Depth
      await at5DatabaseService.saveParameterMapping({
        gearName: "Noise Gate",
        parameter: "Depth",
        visualMin: -20,
        visualMax: -100,
        visualUnit: "dB",
        exportMin: -20,
        exportMax: -100,
        exportParameterName: "Depth",
        conversion: "direct"
      });

      setFeedback({ type: 'success', message: 'Seeded Noise Gate parameter mappings to database!' });
      await loadMappings();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Seeding failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = mappings.filter(m => {
    const s = searchTerm.toLowerCase();
    return (
      m.gearName.toLowerCase().includes(s) ||
      m.parameter.toLowerCase().includes(s) ||
      m.exportParameterName.toLowerCase().includes(s) ||
      m.conversion.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-gear-accent" />
          <h3 className="text-lg font-display font-medium text-white">Parameter Mapping Vault</h3>
        </div>
        
        <div className="flex gap-2">
          {mappings.length === 0 && (
            <button
              onClick={seedSampleNoiseGate}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-mono font-bold border border-cyan-500/35 transition-all flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5" />
              SEED SAMPLE NOISE GATE
            </button>
          )}
          
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-gear-accent hover:bg-gear-accent-hover text-black rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isAdding ? 'CANCEL' : 'ADD MAPPING'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border ${feedback.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'} flex justify-between items-center text-xs`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 text-xs text-gray-300"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 font-mono mb-1">Gear Name *</label>
              <input 
                type="text" 
                value={form.gearName}
                onChange={e => setForm(f => ({ ...f, gearName: e.target.value }))}
                placeholder="e.g. Noise Gate, Brit 8000"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Parameter Name *</label>
              <input 
                type="text" 
                value={form.parameter}
                onChange={e => setForm(f => ({ ...f, parameter: e.target.value }))}
                placeholder="e.g. Threshold, Release"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-500 font-mono mb-1">Visual Min</label>
              <input 
                type="number" 
                step="any"
                value={form.visualMin}
                onChange={e => setForm(f => ({ ...f, visualMin: Number(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Visual Max</label>
              <input 
                type="number" 
                step="any"
                value={form.visualMax}
                onChange={e => setForm(f => ({ ...f, visualMax: Number(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Visual Unit</label>
              <input 
                type="text" 
                value={form.visualUnit}
                onChange={e => setForm(f => ({ ...f, visualUnit: e.target.value }))}
                placeholder="e.g. dB, ms, Hz"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-500 font-mono mb-1">Export Parameter Name *</label>
              <input 
                type="text" 
                value={form.exportParameterName}
                onChange={e => setForm(f => ({ ...f, exportParameterName: e.target.value }))}
                placeholder="e.g. Threshold, Release"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Export Min</label>
              <input 
                type="number" 
                step="any"
                value={form.exportMin}
                onChange={e => setForm(f => ({ ...f, exportMin: Number(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Export Max</label>
              <input 
                type="number" 
                step="any"
                value={form.exportMax}
                onChange={e => setForm(f => ({ ...f, exportMax: Number(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 font-mono mb-1">Conversion Mode *</label>
              <select 
                value={form.conversion}
                onChange={e => setForm(f => ({ ...f, conversion: e.target.value as any }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
                required
              >
                <option value="direct">direct (straight passthrough)</option>
                <option value="db_to_linear">db_to_linear (10^(dB/20))</option>
                <option value="linear_to_db">linear_to_db (20*log10(x))</option>
                <option value="scaled_range">scaled_range (visual min..max maps to export min..max)</option>
                <option value="enum">enum (set of predefined string mappings)</option>
                <option value="boolean">boolean (0 / 1 / true / false)</option>
                <option value="unknown">unknown (broad fallback)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-500 font-mono mb-1">Formula Note</label>
              <input 
                type="text" 
                value={form.formula || ''}
                onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                placeholder="e.g. 10^(dB/20)"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-gear-accent outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gear-accent text-black font-semibold rounded-lg hover:bg-gear-accent-hover transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Mapping Rules
            </button>
          </div>
        </motion.form>
      )}

      {/* SEARCH */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-gray-500" />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter parameters by gear, keyword, or conversion mode..."
          className="w-full pl-10 pr-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-white/15 transition-all"
        />
      </div>

      {/* ITEMS TABLE/LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-gear-accent" />
          <span>Synchronizing with Cloud State...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col items-center gap-3">
          <AlertCircle className="w-6 h-6 text-gray-600" />
          <p>No verified parameter mappings imported yet.</p>
          <button
            onClick={seedSampleNoiseGate}
            className="px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-[10px] uppercase font-mono tracking-widest hover:bg-white/10 transition-all"
          >
            Auto-Seed Noise Gate Rules
          </button>
        </div>
      ) : (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-mono uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Gear</th>
                <th className="py-3 px-4">Param</th>
                <th className="py-3 px-4">Visual Range</th>
                <th className="py-3 px-4 flex items-center gap-1">Export Name</th>
                <th className="py-3 px-4">Mode / Formula</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{m.gearName}</td>
                  <td className="py-3 px-4 font-mono text-cyan-300">{m.parameter}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {m.visualMin} to {m.visualMax} <span className="text-gray-500">{m.visualUnit || 'None'}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{m.exportParameterName}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[10px] font-mono uppercase">
                        {m.conversion}
                      </span>
                      {m.formula && <p className="text-[10px] font-mono text-gray-500">f: {m.formula}</p>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {deleteConfId === m.id ? (
                      <div className="flex gap-1 justify-end">
                        <button 
                          onClick={() => handleDelete(m.id!)} 
                          className="px-2 py-1 bg-red-500 text-white rounded font-mono text-[10px] font-bold"
                        >
                          SURE
                        </button>
                        <button 
                          onClick={() => setDeleteConfId(null)} 
                          className="px-2 py-1 bg-white/10 text-gray-300 rounded font-mono text-[10px]"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfId(m.id!)}
                        className="p-1 hover:bg-red-500/10 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
