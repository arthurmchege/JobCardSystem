// JOB CARD FORM 

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobCardAPI, customerAPI, userAPI } from '../../services/api';

const CreateJobCard = () => {
  const navigate = useNavigate();
  const [customers, setCustomers]   = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [form, setForm] = useState({
    customer_id: '',
    technician_id: '',
    title: '',
    description: '',
    priority: 'medium',
    scheduled_date: '',
    estimated_duration: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  //  Load customers and technicians for dropdowns 
  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, uRes] = await Promise.all([
          customerAPI.getAll({ limit: 100 }),
          userAPI.getAll({ role: 'technician', limit: 100 }),
        ]);
        setCustomers(cRes.data?.customers || cRes.data || []);
        setTechnicians(uRes.data?.users || uRes.data || []);
      } catch {
        setGlobalError('Failed to load customers and technicians');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  //  Validation 
  const validate = () => {
    const e = {};
    if (!form.customer_id)    e.customer_id   = 'Please select a customer';
    if (!form.technician_id)  e.technician_id = 'Please select a technician';
    if (!form.title.trim())   e.title         = 'Title is required';
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.scheduled_date) e.scheduled_date = 'Scheduled date is required';
    if (form.estimated_duration && (isNaN(form.estimated_duration) || Number(form.estimated_duration) <= 0))
      e.estimated_duration = 'Must be a positive number of minutes';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  //  Submit 
  const handleSubmit = async e => {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        customer_id:   Number(form.customer_id),
        technician_id: Number(form.technician_id),
        title:         form.title.trim(),
        priority:      form.priority,
        scheduled_date: form.scheduled_date,
      };
      if (form.description.trim())    payload.description         = form.description.trim();
      if (form.estimated_duration)    payload.estimated_duration  = Number(form.estimated_duration);
      if (form.notes.trim())          payload.notes               = form.notes.trim();

      const res = await jobCardAPI.create(payload);
      navigate(`/supervisor/jobs/${res.data.jobCard.id}`);
    } catch (err) {
      setGlobalError(typeof err === 'string' ? err : 'Failed to create job card. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = field =>
    `block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
     ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`;

  if (loadingData) return (
    <div className="flex items-center justify-center h-64">
      <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/jobs')}
          className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Job Card</h1>
          <p className="text-sm text-gray-500">Assign work to a technician</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {globalError && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job title <span className="text-red-500">*</span>
            </label>
            <input name="title" type="text" value={form.title} onChange={handleChange}
              placeholder="e.g. Annual HVAC Service" className={inputClass('title')}/>
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Customer + Technician */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select name="customer_id" value={form.customer_id} onChange={handleChange}
                className={inputClass('customer_id')}>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.customer_id && <p className="mt-1 text-xs text-red-600">{errors.customer_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technician <span className="text-red-500">*</span>
              </label>
              <select name="technician_id" value={form.technician_id} onChange={handleChange}
                className={inputClass('technician_id')}>
                <option value="">Select technician…</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.technician_id && <p className="mt-1 text-xs text-red-600">{errors.technician_id}</p>}
            </div>
          </div>

          {/* Priority + Scheduled date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className={inputClass('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled date <span className="text-red-500">*</span>
              </label>
              <input name="scheduled_date" type="date" value={form.scheduled_date} onChange={handleChange}
                className={inputClass('scheduled_date')}/>
              {errors.scheduled_date && <p className="mt-1 text-xs text-red-600">{errors.scheduled_date}</p>}
            </div>
          </div>

          {/* Est. Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated duration <span className="text-gray-400 text-xs">(minutes, optional)</span>
            </label>
            <input name="estimated_duration" type="number" min="1" value={form.estimated_duration}
              onChange={handleChange} placeholder="e.g. 120"
              className={inputClass('estimated_duration')}/>
            {errors.estimated_duration && <p className="mt-1 text-xs text-red-600">{errors.estimated_duration}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea name="description" rows={3} value={form.description} onChange={handleChange}
              placeholder="Describe the work to be performed…"
              className={`${inputClass('description')} resize-none`}/>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal notes <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea name="notes" rows={2} value={form.notes} onChange={handleChange}
              placeholder="Any instructions or notes for the technician…"
              className={`${inputClass('notes')} resize-none`}/>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/supervisor/jobs')}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-300
                rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white
                text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-700
                disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {submitting ? (
                <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>Creating…</>
              ) : 'Create Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobCard;
