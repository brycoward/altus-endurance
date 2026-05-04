import React from 'react';
import { Utensils, Zap, Activity, Edit2, Trash2, Check, X, Minus, Flame, ChevronDown, ChevronRight, Plus, Sparkles, Loader2, Scale, Heart, Moon, Clock } from 'lucide-react';
import { useJournal, useJournalForDate, useUpdateFood, useDeleteFood, useUpdateActivity, useDeleteActivity, useLogFood, useLogActivity, useEstimate, useLogHealth, useUpdateHealth, useDeleteHealth } from '../hooks/useAltus';
import { useUnits } from '../hooks/useUnits';
import { clsx } from 'clsx';

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack", "WorkoutFuel"];


function AddFoodEntry({ slot, dateStr, onCancel, initialData }: { slot: string, dateStr?: string, onCancel: () => void, initialData?: any }) {
  const [data, setData] = React.useState({
    description: initialData?.description || '',
    kcal: initialData?.kcal || 0,
    protein_g: initialData?.protein_g || 0,
    carbs_g: initialData?.carbs_g || 0,
    fat_g: initialData?.fat_g || 0,
    alcohol_g: initialData?.alcohol_g || 0,
    sodium_mg: initialData?.sodium_mg || 0,
    caffeine_mg: initialData?.caffeine_mg || 0,
    hydration_ml: initialData?.hydration_ml || 0,
    iron_mg: initialData?.iron_mg || 0,
    calcium_mg: initialData?.calcium_mg || 0,
    potassium_mg: initialData?.potassium_mg || 0,
    meal_slot: slot,
    timestamp: dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString()
  });
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const logFood = useLogFood();
  const estimate = useEstimate();

  const handleEstimate = () => {
    if (!data.description) return;
    estimate.mutate(data.description, {
      onSuccess: (resp) => {
        const food = resp.logs.find((l: any) => l.type === 'food');
        if (food) {
          setData(prev => ({
            ...prev,
            kcal: food.kcal ?? prev.kcal,
            protein_g: food.protein_g ?? prev.protein_g,
            carbs_g: food.carbs_g ?? prev.carbs_g,
            fat_g: food.fat_g ?? prev.fat_g,
            alcohol_g: food.alcohol_g ?? prev.alcohol_g,
            sodium_mg: food.sodium_mg ?? prev.sodium_mg,
            caffeine_mg: food.caffeine_mg ?? prev.caffeine_mg,
            hydration_ml: food.hydration_ml ?? prev.hydration_ml,
            iron_mg: food.iron_mg ?? prev.iron_mg,
            calcium_mg: food.calcium_mg ?? prev.calcium_mg,
            potassium_mg: food.potassium_mg ?? prev.potassium_mg,
            description: food.description ?? prev.description
          }));

          // Show advanced fields if any are populated
          const hasAdvanced = food.alcohol_g > 0 || 
                             food.sodium_mg > 0 || 
                             food.caffeine_mg > 0 || 
                             food.hydration_ml > 0 || 
                             food.iron_mg > 0 || 
                             food.calcium_mg > 0 || 
                             food.potassium_mg > 0;
          if (hasAdvanced) setShowAdvanced(true);
        }
      }
    });
  };

  const calculateTotalKcal = (p: any, c: any, f: any) => {
    const protein = parseFloat(p) || 0;
    const carbs = parseFloat(c) || 0;
    const fat = parseFloat(f) || 0;
    return (protein * 4) + (carbs * 4) + (fat * 9);
  };

  const updateMacro = (key: string, val: string) => {
    const numVal = parseFloat(val) || 0;
    setData(prev => {
      const newData = { ...prev, [key]: numVal };
      const newKcal = calculateTotalKcal(
        key === 'protein_g' ? numVal : newData.protein_g,
        key === 'carbs_g' ? numVal : newData.carbs_g,
        key === 'fat_g' ? numVal : newData.fat_g
      );
      return { ...newData, kcal: Math.round(newKcal) };
    });
  };

  const handleSave = () => {
    const finalData = {
      ...data,
      meal_slot: slot,
      timestamp: data.timestamp || (dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString())
    };
    console.log('Saving food data (final):', finalData);
    logFood.mutate(finalData, {
      onSuccess: () => onCancel()
    });
  };



  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-emerald-500/50 p-4 rounded-2xl space-y-3 mb-4 animate-in zoom-in-95 duration-200">


      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-4">
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Description</label>
          <div className="flex gap-2">
            <input 
              autoFocus
              value={data.description} 
              onChange={e => setData({...data, description: e.target.value})}
              className="flex-1 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors"
              placeholder="What did you eat?"
            />
            <button 
              disabled={!data.description || estimate.isLoading}
              onClick={handleEstimate}
              className="px-4 bg-[rgb(var(--bg-primary))] text-emerald-400 border border-[rgb(var(--border))] rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            >
              {estimate.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Kcal</label>
          <input type="number" value={data.kcal} onChange={e => setData({...data, kcal: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Protein (g)</label>
          <input type="number" value={data.protein_g} onChange={e => updateMacro('protein_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Carbs (g)</label>
          <input type="number" value={data.carbs_g} onChange={e => updateMacro('carbs_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Fat (g)</label>
          <input type="number" value={data.fat_g} onChange={e => updateMacro('fat_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
      </div>
      
      <div className="pt-2">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          className="flex items-center gap-1 text-[10px] font-black uppercase text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors tracking-widest"
        >
          {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Advanced Nutrition
        </button>
        
        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Alcohol (g)</label>
              <input type="number" value={data.alcohol_g} onChange={e => setData({...data, alcohol_g: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Sodium (mg)</label>
              <input type="number" value={data.sodium_mg} onChange={e => setData({...data, sodium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Caffeine (mg)</label>
              <input type="number" value={data.caffeine_mg} onChange={e => setData({...data, caffeine_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Hydration (ml)</label>
              <input type="number" value={data.hydration_ml} onChange={e => setData({...data, hydration_ml: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Iron (mg)</label>
              <input type="number" value={data.iron_mg} onChange={e => setData({...data, iron_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Calcium (mg)</label>
              <input type="number" value={data.calcium_mg} onChange={e => setData({...data, calcium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Potassium (mg)</label>
              <input type="number" value={data.potassium_mg} onChange={e => setData({...data, potassium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
        <button onClick={onCancel} className="px-6 py-2.5 bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
        <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10">Save Entry</button>
      </div>
    </div>
  );
}

function AddActivityEntry({ dateStr, onCancel }: { dateStr?: string, onCancel: () => void }) {
  const [data, setData] = React.useState({
    type: '',
    duration_min: 30,
    kcal_burned: 0,
    timestamp: dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString()
  });
  const logActivity = useLogActivity();
  const estimate = useEstimate();

  const handleEstimate = () => {
    if (!data.type) return;
    estimate.mutate(data.type, {
      onSuccess: (resp) => {
        const act = resp.logs.find((l: any) => l.type === 'activity');
        if (act) {
          setData(prev => ({
            ...prev,
            kcal_burned: act.kcal_burned || prev.kcal_burned,
            duration_min: act.duration_min || prev.duration_min,
            type: act.activity_type || prev.type
          }));
        }
      }
    });
  };

  const handleSave = () => {
    const finalData = {
      ...data,
      timestamp: data.timestamp || (dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString())
    };
    console.log('Saving activity data (final):', finalData);
    logActivity.mutate(finalData, {
      onSuccess: () => onCancel()
    });
  };



  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-emerald-500/50 p-4 rounded-2xl space-y-3 mb-4 animate-in zoom-in-95 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-3">
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Activity Type</label>
          <div className="flex gap-2">
            <input 
              autoFocus
              value={data.type} 
              onChange={e => setData(prev => ({...prev, type: e.target.value}))}
              className="flex-1 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors"
              placeholder="e.g. 30 min Run"
            />
            <button 
              disabled={!data.type || estimate.isLoading}
              onClick={handleEstimate}
              className="px-4 bg-[rgb(var(--bg-primary))] text-emerald-400 border border-[rgb(var(--border))] rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
            >
              {estimate.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Duration (min)</label>
          <input type="number" value={data.duration_min} onChange={e => setData({...data, duration_min: parseInt(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-[rgb(var(--text-muted))] mb-2 block tracking-widest">Burned (kcal)</label>
          <input type="number" value={data.kcal_burned} onChange={e => setData({...data, kcal_burned: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-bold text-[rgb(var(--text-primary))] focus:border-emerald-500/50 outline-none transition-colors" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
        <button onClick={onCancel} className="px-6 py-2.5 bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
        <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10">Save Activity</button>
      </div>
    </div>
  );
}


function FoodEntry({ food }: { food: any }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [editData, setEditData] = React.useState(food);
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();
  const u = useUnits();

  const handleSave = () => {
    updateFood.mutate({ foodId: food.id, data: editData }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const calculateTotalKcal = (p: any, c: any, f: any) => {
    const protein = parseFloat(p) || 0;
    const carbs = parseFloat(c) || 0;
    const fat = parseFloat(f) || 0;
    return (protein * 4) + (carbs * 4) + (fat * 9);
  };

  const updateMacro = (key: string, val: string) => {
    const numVal = parseFloat(val) || 0;
    const newData = { ...editData, [key]: numVal };
    const newKcal = calculateTotalKcal(
      key === 'protein_g' ? numVal : newData.protein_g,
      key === 'carbs_g' ? numVal : newData.carbs_g,
      key === 'fat_g' ? numVal : newData.fat_g
    );
    setEditData({ ...newData, kcal: Math.round(newKcal) });
  };

  if (isEditing) {
    return (
      <div className="bg-[rgb(var(--bg-secondary))] border border-emerald-500/30 p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Description</label>
            <input 
              value={editData.description} 
              onChange={e => setEditData({...editData, description: e.target.value})}
              className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-sm text-[rgb(var(--text-primary))]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Category</label>
            <select
              value={editData.meal_slot}
              onChange={e => setEditData({...editData, meal_slot: e.target.value})}
              className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-sm text-[rgb(var(--text-primary))]"
            >
              {SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot === 'WorkoutFuel' ? 'Workout Fuel' : slot}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Kcal</label>
            <input type="number" value={editData.kcal} onChange={e => setEditData({...editData, kcal: parseFloat(e.target.value)})} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-xs text-[rgb(var(--text-primary))]" placeholder="kcal" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Protein</label>
            <input type="number" value={editData.protein_g} onChange={e => updateMacro('protein_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-xs text-[rgb(var(--text-primary))]" placeholder="P" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Carbs</label>
            <input type="number" value={editData.carbs_g} onChange={e => updateMacro('carbs_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-xs text-[rgb(var(--text-primary))]" placeholder="C" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] mb-1 block">Fat</label>
            <input type="number" value={editData.fat_g} onChange={e => updateMacro('fat_g', e.target.value)} className="w-full bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-xs text-[rgb(var(--text-primary))]" placeholder="F" />
          </div>
        </div>

        <div className="pt-1">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)} 
            className="flex items-center gap-1 text-[9px] font-black uppercase text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors tracking-widest"
          >
            {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Edit Advanced
          </button>
          
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 p-3 bg-[rgb(var(--bg-primary))] rounded-xl border border-[rgb(var(--border))]">
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">Alcohol (g)</label>
                <input type="number" value={editData.alcohol_g} onChange={e => setEditData({...editData, alcohol_g: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">Sodium (mg)</label>
                <input type="number" value={editData.sodium_mg} onChange={e => setEditData({...editData, sodium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">Caffeine (mg)</label>
                <input type="number" value={editData.caffeine_mg} onChange={e => setEditData({...editData, caffeine_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">H2O (ml)</label>
                <input type="number" value={editData.hydration_ml} onChange={e => setEditData({...editData, hydration_ml: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">Iron (mg)</label>
                <input type="number" value={editData.iron_mg} onChange={e => setEditData({...editData, iron_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">Calcium (mg)</label>
                <input type="number" value={editData.calcium_mg} onChange={e => setEditData({...editData, calcium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))] mb-1 block">K (mg)</label>
                <input type="number" value={editData.potassium_mg} onChange={e => setEditData({...editData, potassium_mg: parseFloat(e.target.value) || 0})} className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded px-2 py-1 text-[10px] text-[rgb(var(--text-primary))]" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-xs font-bold transition-colors">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-4 rounded-2xl hover:border-emerald-500/30 transition-all relative">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-1.5 text-[rgb(var(--text-muted))] hover:text-emerald-400 transition-colors"><Edit2 size={14} /></button>
        <button onClick={() => deleteFood.mutate(food.id)} className="p-1.5 text-[rgb(var(--text-muted))] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[rgb(var(--text-primary))] font-bold">{food.description}</div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] font-black uppercase mt-1 flex items-center gap-1">
            <Clock size={10} className="text-emerald-500/50" />
            {new Date(food.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <MacroBadge label="P" value={food.protein_g} color="bg-blue-500/10 text-blue-400" />
            <MacroBadge label="C" value={food.carbs_g} color="bg-amber-500/10 text-amber-400" />
            <MacroBadge label="F" value={food.fat_g} color="bg-rose-500/10 text-rose-400" />
            <div className="ml-2 px-2 py-1 bg-[rgb(var(--bg-primary))] rounded text-xs font-black text-[rgb(var(--text-secondary))]">
              {Math.round(food.kcal)} <span className="opacity-40 font-normal">kcal</span>
            </div>
          </div>
          {(food.alcohol_g > 0 || food.sodium_mg > 0 || food.caffeine_mg > 0 || food.hydration_ml > 0 || food.iron_mg > 0 || food.calcium_mg > 0 || food.potassium_mg > 0) && (
            <div className="flex gap-1.5 flex-wrap justify-end">
              <MacroBadge label="Alc" value={food.alcohol_g} color="bg-purple-500/10 text-purple-400" />
              <MacroBadge label="Na" value={food.sodium_mg} color="bg-slate-500/10 text-[rgb(var(--text-muted))]" />
              <MacroBadge label="Caf" value={food.caffeine_mg} color="bg-orange-500/10 text-orange-400" />
              <MacroBadge label={u.unit === 'imperial' ? 'H₂O (oz)' : 'H₂O (ml)'} value={u.toUnit.volume(food.hydration_ml || 0)} color="bg-cyan-500/10 text-cyan-400" />
              <MacroBadge label="Fe" value={food.iron_mg} color="bg-red-500/10 text-red-400" />
              <MacroBadge label="Ca" value={food.calcium_mg} color="bg-zinc-500/10 text-[rgb(var(--text-muted))]" />
              <MacroBadge label="K" value={food.potassium_mg} color="bg-yellow-500/10 text-yellow-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityEntry({ activity }: { activity: any }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState(activity);
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const handleSave = () => {
    updateActivity.mutate({ activityId: activity.id, data: editData }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  if (isEditing) {
    return (
      <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Activity Type</label>
          <input 
            value={editData.type} 
            onChange={e => setEditData({...editData, type: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Duration (min)</label>
            <input type="number" value={editData.duration_min} onChange={e => setEditData({...editData, duration_min: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Burned (kcal)</label>
            <input type="number" value={editData.kcal_burned} onChange={e => setEditData({...editData, kcal_burned: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-xs font-bold transition-colors">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex justify-between items-center hover:border-emerald-500/20 transition-all relative">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"><Edit2 size={14} /></button>
        <button onClick={() => deleteActivity.mutate(activity.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
      </div>
      <div>
        <div className="text-emerald-100 font-bold">{activity.type}</div>
        <div className="text-[10px] text-emerald-500/60 font-black uppercase flex items-center gap-1 mt-1">
          <Clock size={10} />
          <span>{activity.duration_min} min • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <div className="text-emerald-400 font-black">-{Math.round(activity.kcal_burned)} kcal</div>
    </div>
  );
}

export function JournalFeed({ 
  dateStr, 
  initialTab, 
  viewMode = 'all' 
}: { 
  dateStr?: string, 
  initialTab?: string,
  viewMode?: 'all' | 'journal' | 'biometrics'
}) {
  const { data: todayJournal, isLoading: isLoadingToday, isError: isErrorToday } = useJournal();
  const { data: historicJournal, isLoading: isLoadingHistoric, isError: isErrorHistoric } = useJournalForDate(dateStr || '');
  const journal = dateStr ? historicJournal : todayJournal;
  const isLoading = dateStr ? isLoadingHistoric : isLoadingToday;
  const isError = dateStr ? isErrorHistoric : isErrorToday;
  const u = useUnits();

  // Yesterday's data for Quick Log
  const viewDate = new Date(dateStr || new Date().toISOString().split('T')[0]);
  const yesterdayDate = new Date(viewDate);
  yesterdayDate.setDate(viewDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const { data: yesterdayJournal } = useJournalForDate(yesterdayStr);

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'WorkoutFuel', 'activity', 'health']));
  const [adding, setAdding] = React.useState<string | null>(initialTab || null);
  const [prefillData, setPrefillData] = React.useState<any>(null);
  const logFood = useLogFood();

  const yesterdayGroupedFood = yesterdayJournal?.food?.reduce((acc: any, food: any) => {
    acc[food.meal_slot] = acc[food.meal_slot] || [];
    acc[food.meal_slot].push(food);
    return acc;
  }, {}) || {};

  React.useEffect(() => {
    if (initialTab) {
      setCollapsed(prev => {
        const next = new Set(prev);
        next.delete(initialTab);
        return next;
      });
      setAdding(initialTab);
    }
  }, [initialTab]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedFood = journal?.food?.reduce((acc: any, food: any) => {
    acc[food.meal_slot] = acc[food.meal_slot] || [];
    acc[food.meal_slot].push(food);
    return acc;
  }, {}) || {};

  const totals = journal?.food?.reduce((acc: any, f: any) => ({
    kcal: acc.kcal + f.kcal,
    protein: acc.protein + f.protein_g,
    carbs: acc.carbs + f.carbs_g,
    fat: acc.fat + f.fat_g,
    alcohol: acc.alcohol + (f.alcohol_g || 0),
    sodium: acc.sodium + (f.sodium_mg || 0),
    caffeine: acc.caffeine + (f.caffeine_mg || 0),
    hydration: acc.hydration + (f.hydration_ml || 0),
    iron: acc.iron + (f.iron_mg || 0),
    calcium: acc.calcium + (f.calcium_mg || 0),
    potassium: acc.potassium + (f.potassium_mg || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, alcohol: 0, sodium: 0, caffeine: 0, hydration: 0, iron: 0, calcium: 0, potassium: 0 }) || {};

  const slotConfig: any = {
    Breakfast: { label: "Breakfast", icon: Utensils },
    Lunch: { label: "Lunch", icon: Utensils },
    Dinner: { label: "Dinner", icon: Utensils },
    Snack: { label: "Snack", icon: Utensils },
    WorkoutFuel: { label: "Workout Fuel", icon: Flame },
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-red-500 text-sm font-bold text-center">
        <div className="space-y-2">
          <p>Error loading journal entries.</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-emerald-500 hover:underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 md:p-12 bg-[rgb(var(--bg-primary))] flex flex-col">
      <div className="max-w-5xl mx-auto space-y-12 pb-32 w-full">
        
        {/* Daily Nutrition Summary */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-sm">
           <div className="flex items-center gap-2 mb-6">
            <Sparkles size={14} className="text-emerald-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Daily Nutrition Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Calories</div>
              <div className="text-sm font-black text-emerald-400">{Math.round(totals.kcal)}<span className="text-[8px] opacity-50 ml-0.5">kcal</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Protein</div>
              <div className="text-sm font-black text-blue-400">{Math.round(totals.protein)}<span className="text-[8px] opacity-50 ml-0.5">g</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Carbs</div>
              <div className="text-sm font-black text-amber-400">{Math.round(totals.carbs)}<span className="text-[8px] opacity-50 ml-0.5">g</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Fat</div>
              <div className="text-sm font-black text-rose-400">{Math.round(totals.fat)}<span className="text-[8px] opacity-50 ml-0.5">g</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Alcohol</div>
              <div className="text-sm font-black text-purple-400">{Math.round(totals.alcohol)}<span className="text-[8px] opacity-50 ml-0.5">g</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Sodium</div>
              <div className="text-sm font-black text-[rgb(var(--text-muted))]">{Math.round(totals.sodium)}<span className="text-[8px] opacity-50 ml-0.5">mg</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Caffeine</div>
              <div className="text-sm font-black text-orange-400">{Math.round(totals.caffeine)}<span className="text-[8px] opacity-50 ml-0.5">mg</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Hydration</div>
              <div className="text-sm font-black text-cyan-400">{Math.round(u.toUnit.volume(totals.hydration))}<span className="text-[8px] opacity-50 ml-0.5">{u.unit === 'imperial' ? 'fl oz' : 'ml'}</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Iron</div>
              <div className="text-sm font-black text-red-400">{totals.iron.toFixed(1)}<span className="text-[8px] opacity-50 ml-0.5">mg</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Calcium</div>
              <div className="text-sm font-black text-[rgb(var(--text-muted))]">{Math.round(totals.calcium)}<span className="text-[8px] opacity-50 ml-0.5">mg</span></div>
            </div>
            <div className="p-3 bg-[rgb(var(--bg-primary))] rounded-2xl border border-[rgb(var(--border))]">
              <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Potassium</div>
              <div className="text-sm font-black text-yellow-400">{Math.round(totals.potassium)}<span className="text-[8px] opacity-50 ml-0.5">mg</span></div>
            </div>
          </div>
        </div>
        {(viewMode === 'all' || viewMode === 'journal') && SLOTS.map(slot => {
          const config = slotConfig[slot];
          const Icon = config.icon;
          const foods = groupedFood[slot] || [];
          const totalKcal = foods.reduce((sum: number, f: any) => sum + f.kcal, 0);
          const isCollapsed = collapsed.has(slot);
          const isAdding = adding === slot;
          
          const yesterdayFoods = yesterdayGroupedFood[slot] || [];
          const lastYesterdayEntry = yesterdayFoods[yesterdayFoods.length - 1];

          const quickLog = (food: any) => {
            const { id, user_id, timestamp, ...cleanFood } = food;
            const targetTimestamp = dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString();
            useLogFood().mutate({
              ...cleanFood,
              timestamp: targetTimestamp
            });
          };

          return (
            <div key={slot} className="relative">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => toggleCollapse(slot)}
                    className="flex items-center gap-3"
                  >
                    <div className="p-2 bg-[rgb(var(--bg-secondary))] rounded-lg border border-[rgb(var(--border))] group-hover:border-emerald-500/30 transition-colors">
                      <Icon size={16} className="text-[rgb(var(--text-muted))]" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] transition-colors">{config.label}</h3>
                    {isCollapsed && totalKcal > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] rounded border border-[rgb(var(--border))] animate-in fade-in zoom-in duration-300">
                        {Math.round(totalKcal)} KCAL
                      </span>
                    )}
                    <div className="text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))] transition-colors">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {!isAdding && lastYesterdayEntry && (
                    <div className="hidden md:flex items-center gap-1 group/quick-container">
                      <button 
                        onClick={() => {
                          setPrefillData(lastYesterdayEntry);
                          setAdding(slot);
                          if (isCollapsed) toggleCollapse(slot);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-l-lg text-[10px] font-black uppercase tracking-widest text-emerald-500/70 hover:text-emerald-500 transition-all"
                      >
                        <ChevronDown size={12} />
                        <span>Add yesterday's {lastYesterdayEntry.description}</span>
                      </button>
                      <button 
                        onClick={() => {
                          const { id, user_id, timestamp, ...cleanFood } = lastYesterdayEntry;
                          const targetTimestamp = dateStr ? `${dateStr}T12:00:00Z` : new Date().toISOString();
                          logFood.mutate({
                            ...cleanFood,
                            timestamp: targetTimestamp
                          });
                        }}
                        title="Instant Add"
                        className="px-2 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/10 border-l-0 rounded-r-lg text-emerald-500/70 hover:text-emerald-500 transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setPrefillData(null);
                    setAdding(isAdding ? null : slot);
                    if (isCollapsed) toggleCollapse(slot);
                  }}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    isAdding ? "bg-emerald-500/20 text-emerald-400" : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-emerald-400 border border-[rgb(var(--border))] hover:border-emerald-500/20"
                  )}
                >
                  <Plus size={16} className={clsx("transition-transform duration-300", isAdding && "rotate-45")} />
                </button>
              </div>

              {!isCollapsed && (
                <div className="space-y-3 pl-11 mt-4 animate-in slide-in-from-top-2 duration-200">
                  {isAdding && (
                    <AddFoodEntry 
                      slot={slot} 
                      dateStr={dateStr} 
                      onCancel={() => {
                        setAdding(null);
                        setPrefillData(null);
                      }} 
                      initialData={prefillData}
                    />
                  )}
                  {foods.map((food: any) => (
                    <FoodEntry key={food.id} food={food} />
                  ))}
                  {foods.length === 0 && !isAdding && (
                    <div className="text-[rgb(var(--text-muted))] text-sm italic font-medium">No entries for {config.label.toLowerCase()}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Activity Section */}
        {(viewMode === 'all' || viewMode === 'journal') && (
          <div className="pt-8 border-t border-[rgb(var(--border))]">
            <div className="flex items-center justify-between group">
              <button 
                onClick={() => toggleCollapse('activity')}
                className="flex items-center gap-3"
              >
                 <div className="p-2 bg-[rgb(var(--bg-secondary))] rounded-lg border border-[rgb(var(--border))] group-hover:border-emerald-500/30 transition-colors">
                  <Activity size={16} className="text-[rgb(var(--text-muted))]" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] transition-colors">Activity</h3>
                {collapsed.has('activity') && (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-500/50 rounded border border-emerald-500/10 animate-in fade-in zoom-in duration-300">
                    {Math.round(journal?.activity?.reduce((sum: number, a: any) => sum + a.kcal_burned, 0) || 0)} KCAL BURNED
                  </span>
                )}
                <div className="text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))] transition-colors">
                  {collapsed.has('activity') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              <button 
                onClick={() => {
                  const isAdding = adding === 'activity';
                  setAdding(isAdding ? null : 'activity');
                  if (collapsed.has('activity')) toggleCollapse('activity');
                }}
                className={clsx(
                  "p-2 rounded-lg transition-all",
                  adding === 'activity' ? "bg-emerald-500/20 text-emerald-400" : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-emerald-400 border border-[rgb(var(--border))] hover:border-emerald-500/20"
                )}
              >
                <Plus size={16} className={clsx("transition-transform duration-300", adding === 'activity' && "rotate-45")} />
              </button>
            </div>
            
            {!collapsed.has('activity') && (
              <div className="space-y-3 pl-11 mt-6 animate-in slide-in-from-top-2 duration-200">
                {adding === 'activity' && (
                  <AddActivityEntry dateStr={dateStr} onCancel={() => setAdding(null)} />
                )}
                {journal?.activity?.map((act: any) => (
                  <ActivityEntry key={act.id} activity={act} />
                ))}
                {(!journal?.activity || journal.activity.length === 0) && adding !== 'activity' && (
                  <div className="text-[rgb(var(--text-muted))] text-sm italic font-medium">No activity logged today</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Biometrics Section */}
        {(viewMode === 'all' || viewMode === 'biometrics') && (
          <div className="pt-8 border-t border-[rgb(var(--border))]">
            <div className="flex items-center justify-between group">
              <button 
                onClick={() => toggleCollapse('health')}
                className="flex items-center gap-3"
              >
                 <div className="p-2 bg-[rgb(var(--bg-secondary))] rounded-lg border border-[rgb(var(--border))] group-hover:border-indigo-500/30 transition-colors">
                  <Scale size={16} className="text-[rgb(var(--text-muted))]" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] transition-colors">Biometrics</h3>
                <div className="text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))] transition-colors">
                  {collapsed.has('health') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              <button 
                onClick={() => {
                  const isAdding = adding === 'health';
                  setAdding(isAdding ? null : 'health');
                  if (collapsed.has('health')) toggleCollapse('health');
                }}
                className={clsx(
                  "p-2 rounded-lg transition-all",
                  adding === 'health' ? "bg-indigo-500/20 text-indigo-400" : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-indigo-400 border border-[rgb(var(--border))] hover:border-indigo-500/20"
                )}
              >
                <Plus size={16} className={clsx("transition-transform duration-300", adding === 'health' && "rotate-45")} />
              </button>
            </div>
            
            {!collapsed.has('health') && (
              <div className="space-y-3 pl-11 mt-6 animate-in slide-in-from-top-2 duration-200">
                {adding === 'health' && (
                  <AddBiometricsEntry dateStr={dateStr} onCancel={() => setAdding(null)} />
                )}
                {journal?.health?.map((h: any) => (
                  <BiometricsEntry key={h.id} health={h} />
                ))}
                {(!journal?.health || journal.health.length === 0) && adding !== 'health' && (
                  <div className="text-[rgb(var(--text-muted))] text-sm italic font-medium">No biometrics logged today</div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function BiometricInput({ 
  label, 
  value, 
  onChange, 
  icon: Icon, 
  step = 1, 
  min = 0, 
  max = 999, 
  placeholder, 
  unit,
  color = "text-indigo-400"
}: { 
  label: string, 
  value: number | null, 
  onChange: (val: number | null) => void, 
  icon: any, 
  step?: number, 
  min?: number, 
  max?: number, 
  placeholder?: string, 
  unit?: string,
  color?: string
}) {
  const handleIncrement = () => {
    const current = value || 0;
    onChange(Math.min(max, parseFloat((current + step).toFixed(1))));
  };

  const handleDecrement = () => {
    const current = value || 0;
    onChange(Math.max(min, parseFloat((current - step).toFixed(1))));
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-3xl hover:border-indigo-500/40 transition-all group shadow-sm hover:shadow-md">
      <div className="flex items-center gap-2">
        <div className={clsx("p-2 rounded-xl bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] group-hover:scale-110 transition-transform shadow-sm", color)}>
          <Icon size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
          {unit && <span className="text-[8px] font-bold text-[rgb(var(--text-muted))] opacity-60 tracking-wider">{unit}</span>}
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input 
            type="number" 
            value={value === null ? '' : value} 
            onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder={placeholder}
            className="w-full bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-2xl py-4 text-center text-2xl font-black text-[rgb(var(--text-primary))] outline-none focus:border-indigo-500/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDecrement}
            className="flex-1 flex items-center justify-center py-2.5 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-indigo-400 border border-[rgb(var(--border))] rounded-xl transition-all hover:bg-[rgb(var(--bg-primary))] active:scale-95"
          >
            <Minus size={16} />
          </button>
          
          <button 
            onClick={handleIncrement}
            className="flex-1 flex items-center justify-center py-2.5 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-indigo-400 border border-[rgb(var(--border))] rounded-xl transition-all hover:bg-[rgb(var(--bg-primary))] active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepInput({ 
  value, 
  onChange, 
  icon: Icon, 
  color = "text-indigo-400"
}: { 
  value: number | null, 
  onChange: (val: number | null) => void, 
  icon: any, 
  color?: string
}) {
  const h = value !== null ? Math.floor(value) : 0;
  const m = value !== null ? Math.round((value - h) * 60) : 0;

  const handleHChange = (newH: number) => {
    onChange(newH + (m / 60));
  };

  const handleMChange = (newM: number) => {
    onChange(h + (newM / 60));
  };

  const handleIncrement = () => {
    const current = value || 0;
    onChange(current + 0.25); // +15 mins
  };

  const handleDecrement = () => {
    const current = value || 0;
    onChange(Math.max(0, current - 0.25)); // -15 mins
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-3xl hover:border-indigo-500/40 transition-all group shadow-sm hover:shadow-md">
      <div className="flex items-center gap-2">
        <div className={clsx("p-2 rounded-xl bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] group-hover:scale-110 transition-transform shadow-sm", color)}>
          <Icon size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Sleep</span>
          <span className="text-[8px] font-bold text-[rgb(var(--text-muted))] opacity-60 tracking-wider">Duration</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-2xl py-3 px-4 focus-within:border-indigo-500/30 transition-all">
          <div className="flex flex-col items-center">
            <input 
              type="number" 
              value={h || ''} 
              onChange={e => handleHChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-12 bg-transparent text-center text-2xl font-black text-[rgb(var(--text-primary))] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))]">Hrs</span>
          </div>
          <div className="text-xl font-black text-[rgb(var(--text-muted))] opacity-30 mt-[-10px]">:</div>
          <div className="flex flex-col items-center">
            <input 
              type="number" 
              value={m || ''} 
              onChange={e => handleMChange(parseInt(e.target.value) || 0)}
              placeholder="00"
              max={59}
              className="w-12 bg-transparent text-center text-2xl font-black text-[rgb(var(--text-primary))] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[8px] font-black uppercase text-[rgb(var(--text-muted))]">Min</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDecrement}
            className="flex-1 flex items-center justify-center py-2.5 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-indigo-400 border border-[rgb(var(--border))] rounded-xl transition-all hover:bg-[rgb(var(--bg-primary))] active:scale-95"
          >
            <Minus size={16} />
          </button>
          
          <button 
            onClick={handleIncrement}
            className="flex-1 flex items-center justify-center py-2.5 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-muted))] hover:text-indigo-400 border border-[rgb(var(--border))] rounded-xl transition-all hover:bg-[rgb(var(--bg-primary))] active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBiometricsEntry({ dateStr, onCancel }: { dateStr?: string, onCancel: () => void }) {
  const initialTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const initialDate = dateStr || new Date().toISOString().split('T')[0];
  const [data, setData] = React.useState({
    weight_kg: null as number | null,
    rhr: null as number | null,
    hrv: null as number | null,
    sleep_score: null as number | null,
    sleep_hours: null as number | null,
    date: initialDate,
    time: initialTime
  });
  const logHealth = useLogHealth();
  const u = useUnits();

  const handleSave = () => {
    const [hours, minutes] = data.time.split(':');
    const timestamp = new Date(`${data.date}T${hours}:${minutes}:00`).toISOString(); 

    const finalData: any = { timestamp };
    if (data.weight_kg !== null) finalData.weight_kg = u.unit === 'imperial' ? u.toMetric.weight(data.weight_kg) : data.weight_kg;
    if (data.rhr !== null) finalData.rhr = data.rhr;
    if (data.hrv !== null) finalData.hrv = data.hrv;
    if (data.sleep_score !== null) finalData.sleep_score = data.sleep_score;
    if (data.sleep_hours !== null) finalData.sleep_hours = Number(data.sleep_hours.toFixed(1));

    logHealth.mutate(finalData, {
      onSuccess: () => onCancel()
    });
  };

  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-indigo-500/50 p-6 rounded-3xl space-y-6 mb-6 animate-in zoom-in-95 duration-200 shadow-2xl shadow-indigo-500/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgb(var(--border))] pb-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Log Biometrics</h4>
          <p className="text-[10px] text-[rgb(var(--text-muted))] font-bold mt-1">Track your vital signs and recovery metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-2xl px-4 py-2">
          <Clock size={14} className="text-indigo-400 shrink-0" />
          <input 
            type="date" 
            value={data.date} 
            onChange={e => setData({...data, date: e.target.value})} 
            className="bg-transparent text-sm font-black text-[rgb(var(--text-primary))] outline-none w-[130px] [color-scheme:dark]" 
          />
          <span className="text-[rgb(var(--text-muted))] opacity-30">|</span>
          <input 
            type="time" 
            value={data.time} 
            onChange={e => setData({...data, time: e.target.value})} 
            className="bg-transparent text-sm font-black text-[rgb(var(--text-primary))] outline-none w-[100px]" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <BiometricInput 
          label="Weight" 
          unit={u.label.weight}
          value={data.weight_kg} 
          onChange={val => setData({...data, weight_kg: val})}
          icon={Scale}
          step={0.1}
          placeholder="0.0"
          color="text-blue-400"
        />
        <BiometricInput 
          label="RHR" 
          unit="bpm"
          value={data.rhr} 
          onChange={val => setData({...data, rhr: val})}
          icon={Heart}
          step={1}
          placeholder="60"
          color="text-rose-400"
        />
        <BiometricInput 
          label="HRV" 
          unit="ms"
          value={data.hrv} 
          onChange={val => setData({...data, hrv: val})}
          icon={Zap}
          step={1}
          placeholder="50"
          color="text-amber-400"
        />
        <BiometricInput 
          label="Sleep Score" 
          unit="/100"
          value={data.sleep_score} 
          onChange={val => setData({...data, sleep_score: val})}
          icon={Sparkles}
          step={1}
          max={100}
          placeholder="1-100"
          color="text-indigo-400"
        />
        <SleepInput 
          value={data.sleep_hours} 
          onChange={val => setData({...data, sleep_hours: val})}
          icon={Moon}
          color="text-slate-400"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[rgb(var(--border))]">
        <button onClick={onCancel} className="px-6 py-2.5 bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
        <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-500 text-slate-950 hover:bg-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20">Save Biometrics</button>
      </div>
    </div>
  );
}

function BiometricsEntry({ health }: { health: any }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState(health);
  const updateHealth = useUpdateHealth();
  const deleteHealth = useDeleteHealth();
  const u = useUnits();

  const handleSave = () => {
    const finalData = {
      ...editData,
      sleep_hours: editData.sleep_hours !== null ? Number(editData.sleep_hours.toFixed(1)) : null
    };
    updateHealth.mutate({ healthId: health.id, data: finalData }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  if (isEditing) {
    const d = new Date(editData.timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const timeVal = `${hh}:${mm}`;
    
    return (
      <div className="bg-[rgb(var(--bg-secondary))] border border-indigo-500/30 p-6 rounded-3xl space-y-6 mb-4 animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] pb-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Edit Biometrics</h4>
          <div className="flex items-center gap-3 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-2xl px-4 py-2">
            <Clock size={14} className="text-indigo-400" />
            <input 
              type="time" 
              value={timeVal} 
              onChange={e => {
                const [h, m] = e.target.value.split(':');
                const newDate = new Date(editData.timestamp);
                newDate.setHours(parseInt(h), parseInt(m));
                setEditData({...editData, timestamp: newDate.toISOString()});
              }} 
              className="bg-transparent text-sm font-black text-[rgb(var(--text-primary))] outline-none" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <BiometricInput 
            label="Weight" 
            unit={u.label.weight}
            value={u.unit === 'imperial' ? u.toUnit.weight(editData.weight_kg || 0) : editData.weight_kg} 
            onChange={val => setEditData({...editData, weight_kg: u.unit === 'imperial' ? u.toMetric.weight(val || 0) : val})}
            icon={Scale}
            step={0.1}
            color="text-blue-400"
          />
          <BiometricInput 
            label="RHR" 
            unit="bpm"
            value={editData.rhr} 
            onChange={val => setEditData({...editData, rhr: val})}
            icon={Heart}
            step={1}
            color="text-rose-400"
          />
          <BiometricInput 
            label="HRV" 
            unit="ms"
            value={editData.hrv} 
            onChange={val => setEditData({...editData, hrv: val})}
            icon={Zap}
            step={1}
            color="text-amber-400"
          />
          <BiometricInput 
            label="Sleep Score" 
            unit="/100"
            value={editData.sleep_score} 
            onChange={val => setEditData({...editData, sleep_score: val})}
            icon={Sparkles}
            step={1}
            max={100}
            color="text-indigo-400"
          />
          <SleepInput 
            value={editData.sleep_hours} 
            onChange={val => setEditData({...editData, sleep_hours: val})}
            icon={Moon}
            color="text-slate-400"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-xl text-xs font-bold transition-all">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl text-xs font-bold transition-all border border-indigo-500/20">Save Changes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl hover:border-indigo-500/20 transition-all relative">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-1.5 text-[rgb(var(--text-muted))] hover:text-indigo-400 transition-colors"><Edit2 size={14} /></button>
        <button onClick={() => deleteHealth.mutate(health.id)} className="p-1.5 text-[rgb(var(--text-muted))] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
      </div>
      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5">
          <Clock size={12} className="text-indigo-500" />
          {new Date(health.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {health.weight_kg !== null && health.weight_kg > 0 && <MetricItem icon={Scale} label="Weight" value={u.formatWeight(health.weight_kg)} color="text-blue-400" />}
        {health.rhr !== null && health.rhr > 0 && <MetricItem icon={Heart} label="RHR" value={`${health.rhr} bpm`} color="text-rose-400" />}
        {health.hrv !== null && health.hrv > 0 && <MetricItem icon={Zap} label="HRV" value={`${health.hrv} ms`} color="text-amber-400" />}
        {health.sleep_score !== null && health.sleep_score > 0 && <MetricItem icon={Sparkles} label="Sleep Score" value={health.sleep_score} color="text-indigo-400" />}
        {health.sleep_hours !== null && health.sleep_hours > 0 && <MetricItem icon={Moon} label="Sleep" value={`${Number(health.sleep_hours.toFixed(1))}h`} color="text-[rgb(var(--text-muted))]" />}
      </div>
    </div>
  );
}

function MetricItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className={color} />
        <span className="text-[10px] font-bold uppercase text-[rgb(var(--text-muted))] tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-black text-[rgb(var(--text-primary))]">{value}</div>
    </div>
  );
}

function MacroBadge({ label, value, color }: { label: string, value: number, color: string }) {
  if (value === 0) return null;
  return (
    <div className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold flex gap-1 items-center", color)}>
      <span className="opacity-50">{label}</span>
      <span>{Math.round(value)}</span>
    </div>
  );
}


