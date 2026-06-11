import React, { useMemo } from 'react';

interface GaugeChartProps {
  /** Valor atual em dias */
  valor: number;
  /** Valor máximo da escala */
  max?: number;
  /** Rótulo abaixo do valor */
  label?: string;
  /** Subtítulo */
  sublabel?: string;
  /** Ação ao clicar no card */
  onClick?: () => void;
}

/**
 * Indicador visual estilo "nível de combustível" que mostra
 * a criticidade da média de dias sem classificação.
 * Verde (0-2 dias), Amarelo (3-4 dias), Vermelho (5+ dias)
 */
const GaugeChart: React.FC<GaugeChartProps> = ({
  valor,
  max = 15,
  label = 'Dias sem classificar',
  sublabel,
  onClick,
}) => {
  const clampedValue = Math.min(Math.max(valor, 0), max);

  const { angle, color, bgGradient, textColor, statusLabel } = useMemo(() => {
    const ratio = clampedValue / max;
    // Ângulo do ponteiro: -135° (esquerda/verde) a +135° (direita/vermelho)
    const ang = -135 + ratio * 270;

    let col: string;
    let bg: string;
    let txt: string;
    let sLabel: string;

    if (clampedValue <= 2) {
      col = '#10B981';
      bg = 'from-emerald-500/20 to-emerald-500/5';
      txt = 'text-emerald-400';
      sLabel = 'Dentro do ideal';
    } else if (clampedValue <= 4) {
      col = '#F59E0B';
      bg = 'from-amber-500/20 to-amber-500/5';
      txt = 'text-amber-400';
      sLabel = 'Atenção necessária';
    } else if (clampedValue <= 7) {
      col = '#F97316';
      bg = 'from-orange-500/20 to-orange-500/5';
      txt = 'text-orange-400';
      sLabel = 'Atraso significativo';
    } else {
      col = '#EF4444';
      bg = 'from-red-500/20 to-red-500/5';
      txt = 'text-red-400';
      sLabel = 'Situação crítica!';
    }

    return { angle: ang, color: col, bgGradient: bg, textColor: txt, statusLabel: sLabel };
  }, [clampedValue, max]);

  const svgSize = 200;
  const cx = svgSize / 2;
  const cy = svgSize / 2 + 10;
  const radius = 75;

  // Arco do gauge (de -135° a 135°, ou seja, 270° total)
  const arcPath = useMemo(() => {
    const startAngle = -135;
    const endAngle = 135;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`;
  }, [cx, cy, radius]);

  // Arco preenchido até o valor
  const filledArcPath = useMemo(() => {
    const startAngle = -135;
    const fillAngle = startAngle + (clampedValue / max) * 270;
    const startRad = (startAngle * Math.PI) / 180;
    const fillRad = (fillAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(fillRad);
    const y2 = cy + radius * Math.sin(fillRad);

    const sweep = fillAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${sweep} 1 ${x2} ${y2}`;
  }, [cx, cy, radius, clampedValue, max]);

  // Ponteiro
  const needleLength = radius - 10;
  const needleAngleRad = (angle * Math.PI) / 180;
  const needleX = cx + needleLength * Math.cos(needleAngleRad);
  const needleY = cy + needleLength * Math.sin(needleAngleRad);

  // Ticks do gauge
  const ticks = useMemo(() => {
    const tickValues = [0, 2, 4, 7, max];
    return tickValues.map((val) => {
      const ratio = val / max;
      const tickAngle = -135 + ratio * 270;
      const tickRad = (tickAngle * Math.PI) / 180;
      const innerR = radius + 8;
      const outerR = radius + 16;
      const labelR = radius + 28;
      return {
        val,
        x1: cx + innerR * Math.cos(tickRad),
        y1: cy + innerR * Math.sin(tickRad),
        x2: cx + outerR * Math.cos(tickRad),
        y2: cy + outerR * Math.sin(tickRad),
        labelX: cx + labelR * Math.cos(tickRad),
        labelY: cy + labelR * Math.sin(tickRad),
      };
    });
  }, [cx, cy, radius, max]);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-gradient-to-br ${bgGradient} backdrop-blur-xl rounded-3xl border border-border p-6 flex flex-col items-center transition-all duration-500 ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]' : ''}`}
    >
      <svg width={svgSize} height={svgSize * 0.7} viewBox={`0 0 ${svgSize} ${svgSize * 0.75}`}>
        {/* Arco de fundo */}
        <path
          d={arcPath}
          fill="none"
          stroke="hsl(217.2, 32.6%, 17.5%)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Segmentos coloridos de fundo */}
        {/* Verde: 0-2 */}
        <path
          d={arcPath}
          fill="none"
          stroke="#10B981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.15"
          strokeDasharray={`${(2 / max) * 270 * (Math.PI * radius) / 180} 9999`}
        />

        {/* Arco preenchido */}
        {clampedValue > 0 && (
          <path
            d={filledArcPath}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${color}50)`,
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        )}

        {/* Ticks */}
        {ticks.map((tick) => (
          <g key={tick.val}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="hsl(215, 20.2%, 65.1%)"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <text
              x={tick.labelX}
              y={tick.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(215, 20.2%, 65.1%)"
              fontSize="9"
              fontWeight="600"
            >
              {tick.val}d
            </text>
          </g>
        ))}

        {/* Ponteiro */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* Ponto central */}
        <circle cx={cx} cy={cy} r="6" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        <circle cx={cx} cy={cy} r="3" fill="hsl(222.2, 84%, 4.9%)" />

        {/* Valor central */}
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="800"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {valor.toFixed(1)}
        </text>
      </svg>

      <p className="text-sm font-bold text-foreground mt-1">{label}</p>
      <p className={`text-xs font-semibold ${textColor} mt-0.5`}>
        {sublabel || statusLabel}
      </p>
    </div>
  );
};

export default GaugeChart;
