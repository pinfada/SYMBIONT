import React, { useEffect, useState } from 'react';
import { getRituals, addRitual, updateRitual, deleteRitual, Ritual, deleteUserRituals } from '../../shared/ritualsApi';

export const AdminRitualsPanel: React.FC = () => {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Ritual>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [rgpdUserId, setRgpdUserId] = useState('');
  const [rgpdResult, setRgpdResult] = useState<string | null>(null);

  // Sécurité simple : clé admin dans localStorage
  const adminKey = localStorage.getItem('symbiont_admin_key');
  if (!adminKey) return <div style={{color:'#ff4b6e',margin:24}}>Accès réservé à l'admin.</div>;

  const refresh = () => getRituals().then(setRituals);
  useEffect(() => {
    refresh();
    // WebSocket notifications
    const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/';
    const ws = new window.WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (['created','updated','deleted'].includes(msg.type)) refresh();
      } catch {}
    };
    return () => ws.close();
  }, []);

  const handleEdit = (ritual: Ritual) => {
    setEditing(ritual._id);
    setForm(ritual);
  };
  const handleSave = async () => {
    if (!form._id || !form.type) { setError('Champs obligatoires manquants'); return; }
    try {
      await updateRitual(form._id, form);
      setEditing(null);
      setForm({});
      setError(null);
      refresh();
    } catch (e) { setError('Erreur lors de la sauvegarde'); }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce rituel ?')) return;
    await deleteRitual(id);
    refresh();
  };
  const handleAdd = async () => {
    if (!form._id || !form.type) { setError('Champs obligatoires manquants'); return; }
    try {
      await addRitual(form as Ritual);
      setAdding(false);
      setForm({});
      setError(null);
      refresh();
    } catch (e) { setError('Erreur lors de l'ajout'); }
  };

  return (
    <div style={{padding:24}}>
      <h2>Admin Rituels</h2>
      <button onClick={refresh} aria-label="Rafraîchir la liste des rituels">Rafraîchir</button>
      <button onClick={()=>{setAdding(true);setForm({});}} aria-label="Ajouter un rituel">Ajouter un rituel</button>
      {error && <div style={{color:'#ff4b6e'}} role="alert">{error}</div>}
      <div style={{margin:'18px 0',padding:'12px',background:'#eaf6fa',borderRadius:8}}>
        <b>Effacement RGPD (tous les rituels d'un utilisateur) :</b><br/>
        <label htmlFor="rgpd-user-id">ID utilisateur</label>
        <input id="rgpd-user-id" value={rgpdUserId} onChange={e=>setRgpdUserId(e.target.value)} placeholder="ID utilisateur…" style={{marginRight:8,outline:'2px solid #00e0ff'}} />
        <button onClick={async()=>{
          if (!rgpdUserId) return;
          try {
            const res = await deleteUserRituals(rgpdUserId);
            setRgpdResult(`Rituels supprimés : ${res.deleted}`);
            refresh();
          } catch { setRgpdResult('Erreur lors de la suppression RGPD'); }
        }} aria-label="Effacer tous les rituels de cet utilisateur">Effacer</button>
        {rgpdResult && <span style={{marginLeft:12,color:'#ff4b6e'}} role="status" aria-live="polite">{rgpdResult}</span>}
      </div>
      <table style={{marginTop:18, width:'100%', borderCollapse:'collapse'}} aria-label="Tableau des rituels">
        <thead>
          <tr style={{background:'#eaf6fa'}}>
            <th scope="col">ID</th><th scope="col">Type</th><th scope="col">Payload</th><th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rituals.map(r => editing===r._id ? (
            <tr key={r._id} style={{background:'#fffbe6'}}>
              <td><input value={form._id||''} onChange={e=>setForm(f=>({...f,_id:e.target.value}))} style={{outline:'2px solid #00e0ff'}} aria-label="ID du rituel" /></td>
              <td><input value={form.type||''} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{outline:'2px solid #00e0ff'}} aria-label="Type du rituel" /></td>
              <td><textarea value={JSON.stringify(form,null,2)} onChange={e=>{try{setForm(JSON.parse(e.target.value));}catch{}}} style={{width:220,outline:'2px solid #00e0ff'}} aria-label="Payload du rituel" /></td>
              <td>
                <button onClick={handleSave} aria-label="Enregistrer les modifications">Enregistrer</button>
                <button onClick={()=>{setEditing(null);setForm({});}} aria-label="Annuler l'édition">Annuler</button>
              </td>
            </tr>
          ) : (
            <tr key={r._id}>
              <td>{r._id}</td>
              <td>{r.type}</td>
              <td><pre style={{fontSize:12,maxWidth:220,overflow:'auto'}}>{JSON.stringify(r,null,2)}</pre></td>
              <td>
                <button onClick={()=>handleEdit(r)} aria-label={`Éditer le rituel ${r._id}`}>Éditer</button>
                <button onClick={()=>handleDelete(r._id)} aria-label={`Supprimer le rituel ${r._id}`}>Supprimer</button>
              </td>
            </tr>
          ))}
          {adding && (
            <tr style={{background:'#eaf6fa'}}>
              <td><input value={form._id||''} onChange={e=>setForm(f=>({...f,_id:e.target.value}))} style={{outline:'2px solid #00e0ff'}} aria-label="ID du rituel" /></td>
              <td><input value={form.type||''} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{outline:'2px solid #00e0ff'}} aria-label="Type du rituel" /></td>
              <td><textarea value={JSON.stringify(form,null,2)} onChange={e=>{try{setForm(JSON.parse(e.target.value));}catch{}}} style={{width:220,outline:'2px solid #00e0ff'}} aria-label="Payload du rituel" /></td>
              <td>
                <button onClick={handleAdd} aria-label="Ajouter le rituel">Ajouter</button>
                <button onClick={()=>{setAdding(false);setForm({});}} aria-label="Annuler l'ajout">Annuler</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}; 