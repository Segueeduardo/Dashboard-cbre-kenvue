

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#374151] rounded-xl px-4 py-3 shadow-xl pointer-events-none">
      <p className="text-xs font-bold text-white mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color || '#f3f4f6' }}>
          {entry.name || 'Valor'}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default CustomTooltip;
