import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Globe,
  Lightbulb,
  ShieldAlert,
  Calculator,
} from 'lucide-react';
import type { AnalysisResult } from '@/types';

interface AnalysisResultPanelProps {
  analysis: AnalysisResult;
}

function VnIndexCard({ vnindex }: { vnindex: AnalysisResult['vnindex'] }) {
  const isUp = vnindex.xuHuong === 'Tăng';
  const isDown = vnindex.xuHuong === 'Giảm';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Info;
  const colorClass = isUp
    ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30'
    : isDown
      ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30'
      : 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-[#3b82f6]" />
        <h4 className="text-sm font-semibold text-white">Bối cảnh VN-Index</h4>
        <span className="text-xs text-slate-500 ml-auto">{`Cập nhật: ${new Date().toLocaleDateString('vi-VN')}`}</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">VN-Index:</span>
          <span className="text-lg font-bold text-white">{vnindex.gia}</span>
          <span className={`text-sm font-semibold ${isUp ? 'text-[#10b981]' : isDown ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
            {vnindex.thayDoi}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {vnindex.xuHuong}
        </span>
      </div>
      <p className="text-sm text-slate-400 mt-3 leading-relaxed">{vnindex.tomTat}</p>
    </div>
  );
}

function ScenarioCard({
  scenario,
  index,
}: {
  scenario: AnalysisResult['kichBan'][0];
  index: number;
}) {
  const isBull = scenario.loai.toLowerCase().includes('tăng');
  const Icon = isBull ? ArrowUpCircle : ArrowDownCircle;
  const accentColor = isBull ? 'text-[#10b981]' : 'text-[#ef4444]';
  const borderColor = isBull ? 'border-[#10b981]/30' : 'border-[#ef4444]/30';
  const bgColor = isBull ? 'bg-[#10b981]/5' : 'bg-[#ef4444]/5';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 animate-slide-in`} style={{ animationDelay: `${index * 100}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${accentColor}`} />
        <h4 className={`font-bold ${accentColor}`}>{scenario.loai}</h4>
      </div>
      <div className="space-y-2.5">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">Điều kiện kích hoạt</p>
          <p className="text-sm text-slate-200 leading-relaxed">{scenario.dieuKien}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium mb-0.5">Hành động</p>
          <p className="text-sm text-slate-200 leading-relaxed">{scenario.hanhDong}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ khuyenNghi }: { khuyenNghi: AnalysisResult['khuyenNghi'] }) {
  const action = khuyenNghi.hanhDong;
  const isBuy = action.toLowerCase().includes('mua') || action.toLowerCase().includes('gia tăng');
  const isHold = action.toLowerCase().includes('nắm giữ');
  const isReduce = action.toLowerCase().includes('hạ') || action.toLowerCase().includes('cắt') || action.toLowerCase().includes('chốt');

  const actionColor = isBuy
    ? 'from-[#10b981] to-[#0d9668] text-white'
    : isHold
      ? 'from-[#3b82f6] to-[#2563eb] text-white'
      : isReduce
        ? 'from-[#ef4444] to-[#dc2626] text-white'
        : 'from-[#f59e0b] to-[#d97706] text-white';

  const items = [
    { label: 'Điểm vào lệnh', value: khuyenNghi.diemVao, icon: Target, color: 'text-[#3b82f6]' },
    { label: 'Dừng lỗ', value: khuyenNghi.dungLo, icon: Shield, color: 'text-[#ef4444]' },
    { label: 'Mục tiêu', value: khuyenNghi.mucTieu, icon: TrendingUp, color: 'text-[#10b981]' },
    { label: 'Tỷ trọng vốn', value: khuyenNghi.tyTrong, icon: Info, color: 'text-[#f59e0b]' },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-[#f59e0b]" />
        <h4 className="text-sm font-semibold text-white">Khuyến nghị hành động</h4>
      </div>
      <div className={`inline-block px-4 py-2 rounded-xl bg-gradient-to-r ${actionColor} font-bold text-base mb-4`}>
        {action}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
              <Icon className={`w-4 h-4 mt-0.5 ${item.color}`} />
              <div>
                <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                <p className="text-sm text-slate-200 font-medium mt-0.5">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisResultPanel({ analysis }: AnalysisResultPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* VN-Index context */}
      <VnIndexCard vnindex={analysis.vnindex} />

      {/* Technical assessment */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#00c2a8]" />
          <h4 className="text-sm font-semibold text-white">Nhận định kỹ thuật</h4>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{analysis.nhanDinhKyThuat}</p>
      </div>

      {/* Quantitative assessment */}
      {analysis.nhanDinhDinhLuong && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-[#8b5cf6]" />
            <h4 className="text-sm font-semibold text-white">Nhận định định lượng</h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.nhanDinhDinhLuong}</p>
        </div>
      )}

      {/* Scenarios */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Target className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-white">Kịch bản giao dịch</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.kichBan.map((scenario, i) => (
            <ScenarioCard key={i} scenario={scenario} index={i} />
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <RecommendationCard khuyenNghi={analysis.khuyenNghi} />

      {/* Risk warning */}
      <div className="glass-card p-5 border-[#f59e0b]/30">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
          <h4 className="text-sm font-semibold text-[#f59e0b]">Cảnh báo rủi ro</h4>
        </div>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.canhBaoRuiRo}</p>
        </div>
      </div>

      {/* Sources */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Nguồn:</span>
        {analysis.nguon.map((src, i) => (
          <span
            key={i}
            className="px-2.5 py-1 text-xs bg-[#1a2030] border border-[#2a3142] rounded-lg text-slate-400"
          >
            {src}
          </span>
        ))}
      </div>
    </div>
  );
}
