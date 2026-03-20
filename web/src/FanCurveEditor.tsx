import React, { useRef, useState } from 'react';

type Point = { temp: number; duty: number };
type ZoneCurve = { a: Point; b: Point; c: Point; d: Point };

interface FanCurveEditorProps {
  curve: ZoneCurve;
  onChange: (point: 'a' | 'b' | 'c' | 'd', field: 'temp' | 'duty', value: number) => void;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 450;
const PADDING = 40;

const FanCurveEditor: React.FC<FanCurveEditorProps> = ({ curve, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activePoint, setActivePoint] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [hoverPoint, setHoverPoint] = useState<'a' | 'b' | 'c' | 'd' | null>(null);

  // Convert real values (0-100) to SVG coordinates
  const getX = (temp: number) => PADDING + (temp / 100) * (SVG_WIDTH - PADDING * 2);
  const getY = (duty: number) => SVG_HEIGHT - PADDING - (duty / 100) * (SVG_HEIGHT - PADDING * 2);

  // Convert SVG coordinates back to real values
  const getTemp = (x: number) => Math.round(((x - PADDING) / (SVG_WIDTH - PADDING * 2)) * 100);
  const getDuty = (y: number) => Math.round((-(y - (SVG_HEIGHT - PADDING)) / (SVG_HEIGHT - PADDING * 2)) * 100);

  const handlePointerDown = (pointId: 'a' | 'b' | 'c' | 'd', e: React.PointerEvent) => {
    e.preventDefault();
    setActivePoint(pointId);
    if (svgRef.current) svgRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePoint || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    
    // Scale client coordinates to viewBox coordinates
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    
    const x = Math.max(PADDING, Math.min(SVG_WIDTH - PADDING, (e.clientX - rect.left) * scaleX));
    const y = Math.max(PADDING, Math.min(SVG_HEIGHT - PADDING, (e.clientY - rect.top) * scaleY));

    let newTemp = getTemp(x);
    const newDuty = getDuty(y);

    // Apply constraints to prevent lines crossing
    if (activePoint === 'a') {
      newTemp = Math.min(newTemp, curve.b.temp - 1);
    } else if (activePoint === 'b') {
      newTemp = Math.max(curve.a.temp + 1, Math.min(newTemp, curve.c.temp - 1));
    } else if (activePoint === 'c') {
      newTemp = Math.max(curve.b.temp + 1, Math.min(newTemp, curve.d.temp - 1));
    } else if (activePoint === 'd') {
      newTemp = Math.max(curve.c.temp + 1, newTemp);
    }

    onChange(activePoint, 'temp', newTemp);
    onChange(activePoint, 'duty', newDuty);
  };

  const handlePointerUp = () => {
    setActivePoint(null);
  };

  const points = [
    { id: 'a', color: '#3b82f6', ...curve.a }, // Blue
    { id: 'b', color: '#10b981', ...curve.b }, // Green
    { id: 'c', color: '#f59e0b', ...curve.c }, // Amber
    { id: 'd', color: '#ef4444', ...curve.d }, // Red
  ];

  const pathD = `M ${getX(curve.a.temp)} ${getY(curve.a.duty)} 
                 L ${getX(curve.b.temp)} ${getY(curve.b.duty)} 
                 L ${getX(curve.c.temp)} ${getY(curve.c.duty)} 
                 L ${getX(curve.d.temp)} ${getY(curve.d.duty)}`;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full text-center text-sm font-bold text-slate-500 tracking-widest mb-4">INTERACTIVE CURVE</div>
      
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full select-none cursor-crosshair touch-none bg-bmcdark-900 border border-white/5 rounded-xl drop-shadow-2xl"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid Lines & Labels */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={`grid-${val}`}>
             {/* Horizontal */}
             <line 
                x1={PADDING} y1={getY(val)} 
                x2={SVG_WIDTH - PADDING} y2={getY(val)} 
                stroke="#ffffff10" strokeWidth="1" 
             />
             <text x={PADDING - 10} y={getY(val) + 4} fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="end">{val}</text>
             
             {/* Vertical */}
             <line 
                x1={getX(val)} y1={PADDING} 
                x2={getX(val)} y2={SVG_HEIGHT - PADDING} 
                stroke="#ffffff10" strokeWidth="1" 
             />
             <text x={getX(val)} y={SVG_HEIGHT - PADDING + 20} fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">{val}</text>
          </g>
        ))}

        {/* Axes Titles */}
        <text x="15" y={SVG_HEIGHT / 2} transform={`rotate(-90 15,${SVG_HEIGHT / 2})`} fill="#64748b" fontSize="12" textAnchor="middle">Duty (%)</text>
        <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 5} fill="#64748b" fontSize="12" textAnchor="middle">Temperature (°C)</text>

        {/* The Curve Line */}
        <path d={pathD} fill="none" stroke="#64748b" strokeWidth="3" />

        {/* The Line Segments with color matching points (visual flair) */}
        <line x1={getX(curve.a.temp)} y1={getY(curve.a.duty)} x2={getX(curve.b.temp)} y2={getY(curve.b.duty)} stroke="#10b981" strokeWidth="3" />
        <line x1={getX(curve.b.temp)} y1={getY(curve.b.duty)} x2={getX(curve.c.temp)} y2={getY(curve.c.duty)} stroke="#f59e0b" strokeWidth="3" />
        <line x1={getX(curve.c.temp)} y1={getY(curve.c.duty)} x2={getX(curve.d.temp)} y2={getY(curve.d.duty)} stroke="#ef4444" strokeWidth="3" />

        {/* Points & Tooltips */}
        {points.map(p => {
          const x = getX(p.temp);
          const y = getY(p.duty);
          const isInteracting = activePoint === p.id || hoverPoint === p.id;
          
          return (
            <g key={p.id}>
              {/* Invisible larger hover target */}
              <circle 
                 cx={x} cy={y} r={25} fill="transparent"
                 className="cursor-grab active:cursor-grabbing"
                 onPointerDown={e => handlePointerDown(p.id as any, e)}
                 onPointerEnter={() => setHoverPoint(p.id as any)}
                 onPointerLeave={() => setHoverPoint(null)}
              />
              
              <circle cx={x} cy={y} r={isInteracting ? 9 : 6} fill={p.color} className="pointer-events-none transition-all" />
              <text x={x} y={y - 15} fill={p.color} fontSize="14" fontWeight="bold" textAnchor="middle" className="pointer-events-none">
                {p.id.toUpperCase()}
              </text>

              {/* Popup Values Tooltip */}
              {isInteracting && (
                 <g className="pointer-events-none">
                    <rect x={x - 40} y={y + 15} width="80" height="30" rx="6" fill="#0f172a" stroke={p.color} strokeWidth="2" opacity="0.9" />
                    <text x={x} y={y + 35} fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">
                       {p.temp}° <tspan fill="#64748b">|</tspan> {p.duty}%
                    </text>
                 </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default FanCurveEditor;
