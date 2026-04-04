import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Save } from 'lucide-react';
import FanCurveEditor from './FanCurveEditor';
import TimeSeriesChart from './TimeSeriesChart';
import WeAiBlock from './WeAiBlock';
import MotherboardMap from './components/MotherboardMap';

type Sensor = {
  id: number;
  name: string;
  type: string;
  reading: number;
  unit: string;
};

type Point = { temp: number; duty: number };
type ZoneCurve = { a: Point; b: Point; c: Point; d: Point };

const DEFAULT_BLOCK_ORDER = ['thermal', 'analytics', 'fans', 'curve'];

const getInitialLayout = () => {
  try {
    const saved = localStorage.getItem('weai_fan_layout');
    if (saved) {
      const parsed = JSON.parse(saved);
      const order = Array.isArray(parsed.block_order) ? parsed.block_order : [];
      const merged = [...order];
      DEFAULT_BLOCK_ORDER.forEach(b => {
         if (!merged.includes(b)) merged.push(b);
      });
      const cleaned = merged.filter(b => DEFAULT_BLOCK_ORDER.includes(b));
      
      return {
         order: cleaned,
         collapsed: Array.isArray(parsed.collapsed_blocks) ? parsed.collapsed_blocks : []
      };
    }
  } catch {}
  return { order: DEFAULT_BLOCK_ORDER, collapsed: [] };
};

// --- Sparkline Component for inline charts ---
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (data.length < 2) return null;
  const min = Math.max(0, Math.min(...data) - 5);
  const max = Math.max(...data) + 5;
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${Math.round(x)},${Math.round(y)}`;
  }).join(' ');
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg className="absolute bottom-0 left-0 w-full h-36 opacity-60 pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
           <stop offset="0%" stopColor={color} stopOpacity="0.8" />
           <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`100,100 0,100 ${pts}`} fill={`url(#${gradId})`} opacity="0.4" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

function App() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [osMetrics, setOsMetrics] = useState({ cpu: 0, gpu: 0 });
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  // WeAi Layout State (Synchronously Initialized)
  const initialLayout = getInitialLayout();
  const [blockOrder, setBlockOrder] = useState<string[]>(initialLayout.order);
  const [collapsedBlocks, setCollapsedBlocks] = useState<string[]>(initialLayout.collapsed);

  // Save Layout to localStorage on change
  useEffect(() => {
    if (blockOrder.length > 0) {
      localStorage.setItem('weai_fan_layout', JSON.stringify({
        block_order: blockOrder,
        collapsed_blocks: collapsedBlocks
      }));
    }
  }, [blockOrder, collapsedBlocks]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/api/ws/sensors');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const bmcData = data.bmc || data; 
        const osData = data.os || { cpu: 0, gpu: 0 };
        
        setSensors(bmcData);
        setOsMetrics(osData);

        const t = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
        const tempEntry: any = { time: t };
        
        bmcData.forEach((s: any) => {
          if (s.type === 'temperature' && s.reading > 0) {
            tempEntry[s.name] = s.reading;
          }
        });
        
        setSensorHistory(prev => {
          const next = [...prev, tempEntry];
          if (next.length > 60) next.shift(); 
          return next;
        });
        setError('');
      } catch (err: any) {
        console.error(err);
      }
    };

    ws.onerror = () => {
       setError("WebSocket connection failed.");
    };

    return () => {
       ws.close();
    };
  }, []);

  const temperatures = sensors.filter(s => s.type === 'temperature' && s.reading > 0);
  const fans = sensors.filter(s => s.type === 'fan' && s.reading > 0);

  // FIXED 6 TIER PRESETS
  type PresetSlot = { id: string; label: string; defaultCurve: ZoneCurve };
  const PRESET_SLOTS: PresetSlot[] = [
    { id: '1', label: 'Keep Calm', defaultCurve: { a: {temp: 0, duty: 25}, b: {temp: 50, duty: 40}, c: {temp: 85, duty: 95}, d: {temp: 100, duty: 100} } },
    { id: '2', label: 'Calm', defaultCurve: { a: {temp: 0, duty: 25}, b: {temp: 40, duty: 40}, c: {temp: 75, duty: 90}, d: {temp: 100, duty: 100} } },
    { id: '3', label: 'Normal', defaultCurve: { a: {temp: 0, duty: 30}, b: {temp: 45, duty: 50}, c: {temp: 80, duty: 100}, d: {temp: 100, duty: 100} } },
    { id: '4', label: 'Hot', defaultCurve: { a: {temp: 0, duty: 40}, b: {temp: 35, duty: 60}, c: {temp: 70, duty: 100}, d: {temp: 100, duty: 100} } },
    { id: '5', label: 'Too Hot', defaultCurve: { a: {temp: 0, duty: 50}, b: {temp: 30, duty: 75}, c: {temp: 60, duty: 100}, d: {temp: 100, duty: 100} } },
    { id: '6', label: 'Extreme', defaultCurve: { a: {temp: 0, duty: 60}, b: {temp: 30, duty: 85}, c: {temp: 50, duty: 100}, d: {temp: 100, duty: 100} } }
  ];

  const [savedSlots, setSavedSlots] = useState<Record<string, ZoneCurve>>({});
  const [activeSlotId, setActiveSlotId] = useState<string>('normal');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bmc_fan_slots');
      if (saved) setSavedSlots(JSON.parse(saved));
    } catch {
      // safe fallback
    }
  }, []);

  const [activeZoneIds, setActiveZoneIds] = useState<number[]>([]);
  const activeCurveKey = activeZoneIds.length === 0 ? 'all' : [...activeZoneIds].sort().join(',');
  const [zoneCurves, setZoneCurves] = useState<Record<string, ZoneCurve>>({ 'all': PRESET_SLOTS[2].defaultCurve });
  const activeCurve = zoneCurves[activeCurveKey] || PRESET_SLOTS[2].defaultCurve;

  const [isSaving, setIsSaving] = useState(false);

  const handlePointChange = (point: 'a'|'b'|'c'|'d', field: 'temp'|'duty', value: number) => {
    setActiveSlotId(''); 
    setZoneCurves(prev => {
        const current = prev[activeCurveKey] || PRESET_SLOTS[2].defaultCurve;
        return {
           ...prev,
           [activeCurveKey]: {
              ...current,
              [point]: { ...current[point], [field]: value }
           }
        };
    });
  };

  const handleApplySlot = (id: string) => {
    setActiveSlotId(id);
    const targetCurve = savedSlots[id] || PRESET_SLOTS.find(s => s.id === id)?.defaultCurve || PRESET_SLOTS[2].defaultCurve;
    setZoneCurves(prev => ({ ...prev, [activeCurveKey]: targetCurve }));
  };

  const handleSaveToSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...savedSlots, [id]: activeCurve };
    setSavedSlots(updated);
    setActiveSlotId(id);
    localStorage.setItem('bmc_fan_slots', JSON.stringify(updated));
  };

  const handleApplyToAll = async (forceCurve?: ZoneCurve) => {
     setIsSaving(true);
     setError('');
     const curveToApply = forceCurve || activeCurve;
     try {
       if (activeZoneIds.length === 0) {
           const res = await fetch('http://localhost:3001/api/fans/apply-curve', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ curve: curveToApply })
           });
           const data = await res.json();
           if (data.error) throw new Error(data.error);
       } else {
           await Promise.all(activeZoneIds.map(async zoneId => {
               const res = await fetch('http://localhost:3001/api/fans/apply-zone-curve', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ zoneId, curve: curveToApply })
               });
               const data = await res.json();
               if (data.error) throw new Error(data.error);
           }));
       }
     } catch (err: any) {
       setError(err.message);
     } finally {
       setIsSaving(false);
     }
  };

  // DND Kit Setup
  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlockOrder((items: string[]) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedBlocks((prev: string[]) => prev.includes(id) ? prev.filter((b: string) => b !== id) : [...prev, id]);
  };

  // RENDER BLOCKS
  const renderBlock = (id: string) => {
    const isCollapsed = collapsedBlocks.includes(id);

    if (id === 'thermal') {
      const cpuSensor = temperatures.find(s => s.name.includes('CPU'));
      const gpuSensor = temperatures.find(s => s.name.includes('PCIE07')); // Assuming PCIE07 is GPU
      const activeTemps = temperatures.filter(s => s !== cpuSensor && s !== gpuSensor);

      // Extract historic arrays for sparklines
      const cpuHistory = sensorHistory.map(h => h[cpuSensor?.name || 'CPU Temp.']).filter(v => v > 0);
      const gpuHistory = sensorHistory.map(h => h[gpuSensor?.name || 'PCIE07 Temp.']).filter(v => v > 0);

      return (
        <WeAiBlock key={id} id={id} title="Thermal Sensors (Active)" isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse}>
           {/* Priority High-Tech CPU/GPU Dashboard */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* CPU */}
              <div className="bg-bmcdark-900/80 rounded-2xl border border-bmcaccent/30 p-6 shadow-[0_0_20px_rgba(20,184,166,0.1)] relative overflow-hidden group min-h-[220px] flex flex-col justify-between">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-bmcaccent to-blue-500 z-10"></div>
                 <Sparkline data={cpuHistory} color="#14b8a6" />
                 
                 <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                    <div className="flex flex-col">
                       <h3 className="text-xl font-bold text-slate-200 tracking-wider mb-3">CPU <span className="text-xs text-slate-500 font-normal ml-1 hidden sm:inline-block">Ryzen Threadripper</span></h3>
                       <div className="flex items-baseline gap-2">
                           <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Load</span>
                           <span className="text-4xl font-black text-bmcaccent drop-shadow-md">{osMetrics.cpu}%</span>
                       </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <div className="text-5xl font-black text-white drop-shadow-lg">{cpuSensor ? cpuSensor.reading : '--'}°C</div>
                    </div>
                 </div>
                 <div className="relative z-10 mt-auto flex items-end justify-between w-full">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-bmcdark-800/80 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/5">Historical Variance</div>
                    <div className="text-sm font-bold text-slate-200 bg-bmcdark-800/80 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/5">
                       {cpuHistory.length > 0 ? `${Math.min(...cpuHistory)}° - ${Math.max(...cpuHistory)}°` : 'Syncing...'}
                    </div>
                 </div>
              </div>

              {/* GPU */}
              <div className="bg-bmcdark-900/80 rounded-2xl border border-purple-500/30 p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden group min-h-[220px] flex flex-col justify-between">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 z-10"></div>
                 <Sparkline data={gpuHistory} color="#a855f7" />
                 
                 <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                    <div className="flex flex-col">
                       <h3 className="text-xl font-bold text-slate-200 tracking-wider mb-3">GPU <span className="text-xs text-slate-500 font-normal ml-1 hidden sm:inline-block">RTX 3090</span></h3>
                       <div className="flex items-baseline gap-2">
                           <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Load</span>
                           <span className="text-4xl font-black text-purple-400 drop-shadow-md">{osMetrics.gpu}%</span>
                       </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <div className="text-5xl font-black text-white drop-shadow-lg">{gpuSensor ? gpuSensor.reading : '--'}°C</div>
                    </div>
                 </div>
                 <div className="relative z-10 mt-auto flex items-end justify-between w-full">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-bmcdark-800/80 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/5">Historical Variance</div>
                    <div className="text-sm font-bold text-slate-200 bg-bmcdark-800/80 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/5">
                       {gpuHistory.length > 0 ? `${Math.min(...gpuHistory)}° - ${Math.max(...gpuHistory)}°` : 'Syncing...'}
                    </div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
             {activeTemps.map(sensor => (
               <div key={sensor.id} className="bg-bmcdark-900/50 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                 <div className="flex justify-between items-center mb-2 relative z-10 text-sm">
                   <span className="font-semibold text-slate-400">{sensor.name}</span>
                   <span className="font-bold text-slate-100">{sensor.reading}°C</span>
                 </div>
                 <div className="w-full h-1 bg-bmcdark-800 rounded-full mt-2 relative z-10">
                   <div 
                     className="h-full bg-bmcaccent rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${Math.min(100, (sensor.reading / 100) * 100)}%` }}
                   ></div>
                 </div>
               </div>
             ))}
             {activeTemps.length === 0 && !error && <div className="col-span-full text-slate-500 italic px-2">Waiting for thermal data...</div>}
           </div>
        </WeAiBlock>
      );
    }

    if (id === 'analytics') {
      if (sensorHistory.length <= 1 || temperatures.length === 0) return null; // Hide block entirely if no history
      return (
        <WeAiBlock key={id} id={id} title="Thermal Analytics (5 Minutes)" isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse}>
           <TimeSeriesChart 
             data={sensorHistory}
             dataKeys={temperatures.map(t => t.name)}
             colors={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']}
             title=""
           />
        </WeAiBlock>
      );
    }

    if (id === 'fans') {
      return (
        <WeAiBlock key={id} id={id} title="Cooling Fans (Spinning)" isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {fans.map(sensor => (
               <div key={sensor.id} className="bg-bmcdark-900/50 rounded-xl p-4 border border-white/5 text-center">
                  <h3 className="text-xs font-medium text-slate-400 mb-2 truncate" title={sensor.name}>{sensor.name}</h3>
                  <span className={`text-xl font-bold block ${sensor.reading > 0 ? 'text-white' : 'text-slate-500'}`}>{sensor.reading}</span>
                  <span className="text-[10px] font-semibold text-bmcaccent uppercase">RPM</span>
               </div>
            ))}
            {fans.length === 0 && !error && <div className="col-span-full text-slate-500 italic px-2">Waiting for fan data...</div>}
          </div>
        </WeAiBlock>
      );
    }

    if (id === 'curve') {
      return (
        <WeAiBlock key={id} id={id} title={
           <div className="flex items-center justify-between w-full">
               <span>Granular Fan Curve Configuration</span>
               <span className="px-3 py-1 bg-bmcaccent/20 text-bmcaccent text-xs font-bold rounded-full border border-bmcaccent/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.2)] ml-4">
                 <span className="w-1.5 h-1.5 rounded-full bg-bmcaccent animate-pulse"></span>
                 {activeZoneIds.length === 0 ? 'SYNCED' : `ZONES: ${activeZoneIds.join(', ')}`}
               </span>
           </div>
        } isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse}>
           
           <div className="grid grid-cols-1 2xl:grid-cols-[1.5fr_1fr] gap-6 w-full items-stretch bg-bmcdark-900/20 rounded-2xl p-4 border border-white/5">
             
             {/* LEFT COLUMN: Motherboard Map */}
             <div className="w-full flex justify-center items-center relative h-full">
                <div className="w-full aspect-square relative">
                   <MotherboardMap 
                  activeZoneIds={activeZoneIds} 
                  onSelectZone={async (id, isCtrl) => {
                      if (id === 'all') {
                          setActiveZoneIds([]);
                      } else {
                          let newZones = [...activeZoneIds];
                          if (isCtrl) {
                              if (newZones.includes(id as number)) newZones = newZones.filter(z => z !== id);
                              else newZones.push(id as number);
                          } else {
                              newZones = [id as number];
                          }
                          setActiveZoneIds(newZones);
                          
                          if (newZones.length === 1) {
                              const targetZone = newZones[0];
                              try {
                                  setIsSaving(true);
                                  const res = await fetch(`http://localhost:3001/api/fans/zone-curve/${targetZone}`);
                                  if (res.ok) {
                                      const curve = await res.json();
                                      setZoneCurves(prev => ({ ...prev, [targetZone.toString()]: curve }));
                                      setActiveSlotId('');
                                  }
                              } catch(e) {
                                  console.error("Failed to load hardware curve for zone", targetZone);
                              } finally {
                                  setIsSaving(false);
                              }
                          }
                      }
                  }}
                  fanSpeeds={fans.reduce((acc, sensor) => { acc[sensor.name] = sensor.reading; return acc; }, {} as Record<string, number>)}
                  thermals={temperatures.reduce((acc, sensor) => { acc[sensor.name] = sensor.reading; return acc; }, {} as Record<string, number>)}
                />
                </div>
             </div>

             {/* RIGHT COLUMN: Stacked Graph and Presets */}
             <div className="flex flex-col gap-4 w-full h-full">
               
               {/* Right Top: Interactive SVG Graph */}
               <div className="bg-bmcdark-900/60 rounded-2xl border border-white/5 p-4 shadow-inner flex flex-col justify-center items-center w-full flex-1">
                 <div className="w-full text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Interactive Curve Map</div>
                 <div className="flex-1 w-full flex justify-center items-center min-h-0">
                   <FanCurveEditor curve={activeCurve} onChange={handlePointChange} />
                 </div>
               </div>

               {/* Right Bottom: 5 States & Apply Button */}
               <div className="flex flex-col gap-3 bg-bmcdark-800/40 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Curve States Library</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {PRESET_SLOTS.map(slot => (
                      <div 
                        key={slot.id} 
                        onDoubleClick={() => {
                            handleApplySlot(slot.id);
                            const targetCurve = savedSlots[slot.id] || PRESET_SLOTS.find(s => s.id === slot.id)?.defaultCurve || PRESET_SLOTS[2].defaultCurve;
                            handleApplyToAll(targetCurve);
                        }}
                        title="Double click to apply instantly!"
                        className={`flex items-center rounded-xl overflow-hidden shadow-sm border transition-all cursor-pointer select-none ${activeSlotId === slot.id ? 'bg-bmcaccent/10 border-bmcaccent/50' : 'bg-bmcdark-900/80 border-white/5 hover:border-white/20 hover:shadow-md'}`}
                      >
                         <button 
                           onClick={() => handleApplySlot(slot.id)}
                           className={`flex-1 p-3 text-left font-bold transition-colors text-sm ${activeSlotId === slot.id ? 'text-bmcaccent' : 'text-slate-300 hover:text-white'}`}
                         >
                           {slot.label} {savedSlots[slot.id] && <span className="text-[9px] ml-1 opacity-70 border border-current px-1 py-0.5 rounded-sm">SAVED</span>}
                         </button>
                         <button 
                           onClick={(e) => handleSaveToSlot(slot.id, e)}
                           title={`Save current curve to ${slot.label}`}
                           className="p-3 bg-bmcdark-800 text-slate-500 hover:bg-emerald-500 hover:text-white transition-colors border-l border-white/5"
                         >
                           <Save size={16} />
                         </button>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                     onClick={() => handleApplyToAll()}
                     disabled={isSaving}
                     className={`w-full border transition-all rounded-xl py-4 font-black uppercase tracking-widest text-sm shadow-xl
                        ${isSaving 
                          ? 'bg-bmcdark-700 text-slate-400 border-bmcdark-700 cursor-wait' 
                          : 'bg-bmcaccent border-bmcaccent text-bmcdark-900 hover:bg-emerald-400 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                  >
                    {isSaving ? 'Syncing Curve Data...' : (activeZoneIds.length === 0 ? '⚡ Apply to All 7 Zones' : `⚡ Apply to ${activeZoneIds.length} Selected Zone(s)`)}
                  </button>
               </div>
             </div>
             
           </div>
        </WeAiBlock>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen w-full flex-col bg-bmcdark-900">
      <header className="flex items-center justify-between px-8 py-4 bg-bmcdark-800 border-b border-bmcdark-700 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-bmcaccent">⚡</span> BMC Fan System
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bmcdark-900 px-4 py-2 rounded-full border border-bmcdark-700">
            <div className={`w-3 h-3 rounded-full ${sensors.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className={`text-sm font-medium ${sensors.length > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {sensors.length > 0 ? 'Live Polling' : 'Connecting'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6">
              <h3 className="font-semibold">Connection Error</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          )}

          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockOrder} strategy={verticalListSortingStrategy}>
               {blockOrder.map(id => renderBlock(id))}
            </SortableContext>
          </DndContext>
        </div>
      </main>
    </div>
  );
}

export default App;
