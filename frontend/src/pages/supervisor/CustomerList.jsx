import { useState, useEffect } from 'react';
import { customerAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const EMPTY = { name:'', email:'', phone:'', address:'', contact_person:'' };

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [errors, setErrors]       = useState({});
  const [submitting, setSub]      = useState(false);
  const { toast }                 = useToast();

  // ✅ FIXED: Simplified load function without useCallback
  const load = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await customerAPI.getAll({ 
        search: searchQuery || undefined, 
        limit: 50 
      });
      setCustomers(res.data?.customers || res.data || []);
    } catch { 
      toast.error('Failed to load customers'); 
    } finally { 
      setLoading(false); 
    }
  };

  // ✅ FIXED: Load once on component mount
  useEffect(() => { 
    load(); 
  }, []);  // Empty dependency array = run once only

  // ✅ FIXED: Debounced search (waits 500ms after user stops typing)
  useEffect(() => {
    // Skip if this is the initial mount (already loaded above)
    if (customers.length === 0 && !search) return;
    
    // Debounce: wait 500ms before searching
    const timer = setTimeout(() => {
      load(search);
    }, 500);
    
    // Cleanup: cancel timer if search changes again
    return () => clearTimeout(timer);
  }, [search]);  // Only re-run when search changes

  const openCreate = () => { setForm(EMPTY); setErrors({}); setModal('form'); setSelected(null); };
  const openEdit   = c  => { setSelected(c); setForm({ name:c.name, email:c.email, phone:c.phone||'', address:c.address||'', contact_person:c.contact_person||'' }); setErrors({}); setModal('form'); };
  const openDelete = c  => { setSelected(c); setModal('delete'); };
  const close      = () => { setModal(null); setSelected(null); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Required';
    if (!form.email.trim())   e.email   = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())   e.phone   = 'Required';
    if (!form.address.trim()) e.address = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSub(true);
    try {
      const payload = { ...form };
      if (!payload.contact_person.trim()) delete payload.contact_person;
      if (selected) {
        await customerAPI.update(selected.id, payload);
        toast.success(`${form.name} updated successfully`);
      } else {
        await customerAPI.create(payload);
        toast.success(`${form.name} added as a customer`);
      }
      close(); 
      load(search);  // ✅ Reload with current search
    } catch (err) {
      toast.error(typeof err === 'string' ? err : `Failed to ${selected ? 'update' : 'create'} customer`);
    } finally { setSub(false); }
  };

  const handleDelete = async () => {
    setSub(true);
    try {
      await customerAPI.delete(selected.id);
      toast.success(`${selected.name} deleted`);
      close(); 
      load(search);  // ✅ Reload with current search
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete customer');
    } finally { setSub(false); }
  };

  const inp = f =>
    `block w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-50
     focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all
     ${errors[f] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sup-title text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{customers.length} registered</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600
            text-white text-sm font-semibold rounded-lg transition-all shadow-sm
            hover:shadow-amber-200 hover:shadow-md active:scale-[0.98]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="block w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-slate-50
              text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"/>
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={5} cols={5}/> : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState type={search ? 'search' : 'customers'} query={search}
            onAction={!search ? openCreate : undefined} actionLabel="Add First Customer"/>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Customer','Contact','Email','Phone','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-500">{c.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{c.contact_person || '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3.5 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50
                          rounded-md hover:bg-blue-100 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => openDelete(c)}
                        className="px-2.5 py-1 text-xs font-semibold text-red-500 bg-red-50
                          rounded-md hover:bg-red-100 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal === 'form' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && close()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation:'modalIn 0.2s cubic-bezier(0,0,0.2,1)' }}>
            <style>{`@keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="sup-title text-base font-bold text-slate-900">
                {selected ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button onClick={close} className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
              {[
                { name:'name',           label:'Company / Customer Name', required:true },
                { name:'email',          label:'Email',                   required:true, type:'email' },
                { name:'phone',          label:'Phone',                   required:true, type:'tel'   },
                { name:'address',        label:'Address',                 required:true },
                { name:'contact_person', label:'Contact Person',          required:false },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <input name={f.name} type={f.type||'text'} value={form[f.name]}
                    onChange={e => { setForm(p=>({...p,[f.name]:e.target.value})); setErrors(p=>({...p,[f.name]:''})); }}
                    className={inp(f.name)}/>
                  {errors[f.name] && <p className="mt-1 text-xs text-red-500">{errors[f.name]}</p>}
                </div>
              ))}

              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={close}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200
                    rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600
                    text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-all
                    active:scale-[0.99]">
                  {submitting ? 'Saving…' : selected ? 'Save changes' : 'Create customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {modal === 'delete' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && close()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            style={{ animation:'modalIn 0.2s cubic-bezier(0,0,0.2,1)' }}>
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h3 className="sup-title text-base font-bold text-slate-900 mb-1.5">Delete customer?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              <strong className="text-gray-600">{selected?.name}</strong> will be permanently removed.
              This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button onClick={close}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200
                  rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={submitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600
                  rounded-xl disabled:opacity-60 transition-all active:scale-[0.99]">
                {submitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;