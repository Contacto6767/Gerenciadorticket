import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CATEGORIES = ['Hardware', 'Software', 'Rede', 'Acesso/Senha', 'Outros'];
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Crítica'];
const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Baixa',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Título é obrigatório.';
    if (!form.description.trim()) errs.description = 'Descrição é obrigatória.';
    return errs;
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const fileErrors = [];
    if (selected.length > MAX_FILES) {
      fileErrors.push(`Máximo de ${MAX_FILES} arquivos permitidos.`);
    }
    selected.forEach(f => {
      if (f.size > MAX_SIZE) {
        fileErrors.push(`"${f.name}" excede 5MB.`);
      }
    });
    if (fileErrors.length > 0) {
      setErrors(prev => ({ ...prev, files: fileErrors.join(' ') }));
      e.target.value = '';
      setFiles([]);
    } else {
      setErrors(prev => ({ ...prev, files: undefined }));
      setFiles(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/tickets', form);
      const ticketId = res.data.id;

      if (files.length > 0) {
        const fd = new FormData();
        files.forEach(f => fd.append('files', f));
        await api.post(`/api/tickets/${ticketId}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar ticket.';
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Ticket</h1>
          <p className="page-subtitle">Preencha os dados para abrir um chamado</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-body">
          {globalError && <div className="alert alert-error mb-4">{globalError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Título <span className="required">*</span>
              </label>
              <input
                className={`form-control${errors.title ? ' error' : ''}`}
                type="text"
                value={form.title}
                onChange={handleChange('title')}
                placeholder="Resumo do problema"
              />
              {errors.title && <p className="form-error">{errors.title}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Descrição <span className="required">*</span>
              </label>
              <textarea
                className={`form-control${errors.description ? ' error' : ''}`}
                rows={5}
                value={form.description}
                onChange={handleChange('description')}
                placeholder="Descreva o problema com detalhes..."
              />
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select
                  className="form-control"
                  value={form.category}
                  onChange={handleChange('category')}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select
                  className="form-control"
                  value={form.priority}
                  onChange={handleChange('priority')}
                >
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Anexos</label>
              <input
                className="form-control"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.txt,.docx,.xlsx"
                onChange={handleFileChange}
              />
              <p className="form-hint">
                Máximo 5 arquivos, 5MB cada. Formatos: PNG, JPG, PDF, TXT, DOCX, XLSX
              </p>
              {errors.files && <p className="form-error">{errors.files}</p>}
              {files.length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: '#64748b' }}>
                  {files.map((f, i) => (
                    <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Enviando...' : '✅ Abrir Ticket'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/tickets')}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
