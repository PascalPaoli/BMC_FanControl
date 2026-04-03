import React from 'react';

type FanZone = {
  id: number;
  label: string;
  x: number;
  y: number;
  tooltipClass?: string;
};

const ZONES: FanZone[] = [
  { id: 1, label: 'CHA_FAN1', x: 95.2, y: 57.6, tooltipClass: 'top-full right-0 mt-[1px] mr-[18px]' },
  { id: 3, label: 'CHA_FAN3', x: 88.8, y: 89.5, tooltipClass: 'top-full left-1/2 -translate-x-1/2 ml-[39px] -mt-[58px]' },
  { id: 2, label: 'CHA_FAN2', x: 92.3, y: 89.5, tooltipClass: 'bottom-full left-1/2 -translate-x-1/2 ml-[45px] -mb-[57px]' },
  { id: 4, label: 'CHA_FAN4', x: 84.4, y: 93.0, tooltipClass: 'bottom-full left-1/2 -translate-x-1/2 -ml-[43px] -mb-[5px]' },
  { id: 5, label: 'CHA_FAN5', x: 37.8, y: 92.7, tooltipClass: 'bottom-full left-1/2 -translate-x-1/2 -ml-[43px] -mb-[1px]' },
  { id: 6, label: 'CHA_FAN6', x: 18.9, y: 50.0, tooltipClass: 'top-full left-1/2 -translate-x-1/2 ml-[43px] -mt-[54px]' },
  { id: 7, label: 'CPU_FAN', x: 84.9, y: 12.0, tooltipClass: 'top-full left-1/2 -translate-x-1/2 -ml-[50px] -mt-[4px]' },
  { id: 8, label: 'CPU_OPT', x: 88.2, y: 12.0, tooltipClass: 'bottom-full left-1/2 -translate-x-1/2 ml-[48px] -mb-[1px]' },
];

interface MotherboardMapProps {
  activeZoneIds: number[];
  onSelectZone: (id: number | 'all', isCtrlKey: boolean) => void;
  fanSpeeds: Record<string, number>;
  thermals: Record<string, number>;
}

const THERMALS = [
  { label: 'LAN', getVal: (t: Record<string, number>) => { const k = Object.keys(t).find(k => k.includes('MAC') || k.includes('LAN')); return k ? t[k] : undefined; }, x: 12.3, y: 32.5, isTwoLine: true, scale: 'px-4 py-2 border-2', valueScale: 'text-4xl', labelScale: 'text-xl' },
  { label: 'CHIPSET', getVal: (t: Record<string, number>) => { const k = Object.keys(t).find(k => k.toUpperCase().includes('CHIP') || k.toUpperCase().includes('PCH')); return k ? t[k] : undefined; }, x: 57.3, y: 69.2, isTwoLine: true, scale: 'px-4 py-2 border-2', valueScale: 'text-4xl', labelScale: 'text-xl' },
  { label: 'GPU', getVal: (t: Record<string, number>) => { const k = Object.keys(t).find(k => k.includes('PCIE07') || k.includes('GPU')); return k ? t[k] : undefined; }, x: 21.9, y: 71.6, isTwoLine: true, scale: 'px-8 py-5 border-2', valueScale: 'text-6xl', labelScale: 'text-3xl' },
  { label: 'CPU', getVal: (t: Record<string, number>) => { const k = Object.keys(t).find(k => k.includes('CPU') || k.includes('RYZEN')); return k ? t[k] : undefined; }, x: 48, y: 28.5, isTwoLine: true, scale: 'border-2', valueScale: 'text-[50px] leading-none', labelScale: 'text-[24px] mt-1', exactStyle: { width: '149px', height: '111px' } },
  
  { label: 'H1', getVal: (t: Record<string, number>) => t['DIMMH1 Temp.'], x: 46, y: 6.9, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'G1', getVal: (t: Record<string, number>) => t['DIMMG1 Temp.'], x: 46, y: 9.7, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'F1', getVal: (t: Record<string, number>) => t['DIMMF1 Temp.'], x: 46, y: 12.5, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'E1', getVal: (t: Record<string, number>) => t['DIMME1 Temp.'], x: 46, y: 14.8, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  
  { label: 'A1', getVal: (t: Record<string, number>) => t['DIMMA1 Temp.'], x: 46, y: 41.7, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'B1', getVal: (t: Record<string, number>) => t['DIMMB1 Temp.'], x: 46, y: 44.5, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'C1', getVal: (t: Record<string, number>) => t['DIMMC1 Temp.'], x: 46, y: 47.3, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
  { label: 'D1', getVal: (t: Record<string, number>) => t['DIMMD1 Temp.'], x: 46, y: 50.1, scale: 'text-[11px] px-1.5 py-0.5', labelScale: 'text-[9px]' },
];

export default function MotherboardMap({ activeZoneIds, onSelectZone, fanSpeeds, thermals }: MotherboardMapProps) {
  const getTempColor = (temp?: number) => {
    if (temp === undefined) return 'bg-gray-800/80 border-gray-600 text-gray-500';
    if (temp < 55) return 'bg-emerald-900/80 border-emerald-500/50 text-emerald-400';
    if (temp < 75) return 'bg-orange-900/80 border-orange-500/50 text-orange-400';
    return 'bg-red-900/80 border-red-500/50 text-red-400';
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl border border-white/5 bg-bmcdark-900 shadow-xl">
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-bmcdark-800/90 p-3 rounded-lg border border-white/10 backdrop-blur-sm shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Fan Ctrl Selector</h3>
        <button
          onClick={(e) => onSelectZone('all', e.ctrlKey || e.metaKey)}
          className={`px-3 py-1.5 text-xs font-bold rounded flex items-center justify-between transition-colors ${
            activeZoneIds.length === 0 
              ? 'bg-bmcaccent text-bmcdark-900' 
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          GLOBAL SYNC
          {activeZoneIds.length === 0 && <span className="w-1.5 h-1.5 rounded-full bg-bmcdark-900 ml-2 animate-pulse"></span>}
        </button>
      </div>

      <div className="relative aspect-square w-full">
        <img 
          src="/motherboard_clean.png?v=5" 
          alt="ASUS Motherboard Schematic"
          className="w-full h-full object-contain opacity-70 rounded-xl pointer-events-none filter drop-shadow-md brightness-90"
          onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23222" /><text x="50" y="50" fill="%23666" font-size="5" text-anchor="middle">Motherboard Image Missing</text><text x="50" y="56" fill="%23666" font-size="3" text-anchor="middle">Save to public/motherboard_clean.png</text></svg>';
          }}
        />

        {ZONES.map((zone, idx) => {
          const isActive = activeZoneIds.length === 0 || activeZoneIds.includes(zone.id);
          return (
            <div
              key={`${zone.id}-${idx}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group cursor-pointer"
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              onClick={(e) => onSelectZone(zone.id, e.ctrlKey || e.metaKey)}
            >
               {isActive && (
                 <div className="absolute w-8 h-8 rounded-full border-2 border-green-500 animate-ping opacity-75 pointer-events-none"></div>
               )}
               
               <div className={`
                 w-4 h-4 rounded-full border-2 border-bmcdark-900 flex items-center justify-center transition-all shadow-lg relative z-20
                 ${isActive ? 'bg-green-500 scale-110' : 'bg-slate-600 hover:bg-slate-400 opacity-60 hover:opacity-100'}
               `}>
                 <div className="w-1 h-1 rounded-full bg-bmcdark-900 pointer-events-none"></div>
               </div>

               <div className={`absolute ${zone.tooltipClass || (zone.y > 80 ? 'bottom-8' : 'top-8')} pointer-events-none flex flex-col items-center transition-opacity duration-200 ${isActive ? 'opacity-100 z-40' : 'opacity-0 group-hover:opacity-100 z-30'}`}>
                 <div className="bg-bmcdark-900 border border-white/10 px-2 py-1 rounded shadow-xl whitespace-nowrap flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-300 uppercase leading-tight">{zone.label}</span>
                    <span className="text-xs font-black text-green-500 leading-tight mt-0.5">{fanSpeeds[zone.label] !== undefined ? `${fanSpeeds[zone.label]} RPM` : '...'}</span>
                 </div>
               </div>
            </div>
          );
        })}

        {THERMALS.map((therm, idx) => {
          const val = therm.getVal(thermals);
          
          return (
            <div
              key={`temp-${idx}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 rounded border backdrop-blur-md transition-all duration-300 pointer-events-none z-10
                ${therm.isTwoLine ? 'shadow-2xl shadow-black/80' : 'shadow-md shadow-black/40'}
                ${getTempColor(val)}
                ${therm.scale || ''}
              `}
              style={{ left: `${therm.x}%`, top: `${therm.y}%`, ...therm.exactStyle }}
            >
              {therm.isTwoLine ? (
                <div className="flex flex-col items-center justify-center">
                  <span className={`font-black drop-shadow-md transition-colors ${therm.valueScale || ''}`}>
                    {val !== undefined ? `${Math.round(val)}°` : 'N/A'}
                  </span>
                  <span className={`font-bold drop-shadow-md opacity-80 uppercase tracking-tight transition-colors ${therm.labelScale || ''}`}>
                    {therm.label}
                  </span>
                </div>
              ) : (
                <>
                  <span className={`font-bold drop-shadow-md opacity-80 uppercase tracking-tight transition-colors ${therm.labelScale || ''}`}>
                    {therm.label}
                  </span>
                  <span className="font-black drop-shadow-md transition-colors">
                    {val !== undefined ? `${Math.round(val)}°` : 'N/A'}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
