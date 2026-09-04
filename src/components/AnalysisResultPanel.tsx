import {
  TrendingUp, TrendingDown, AlertTriangle, Target, Shield,
  ArrowUpCircle, ArrowDownCircle, Info, Globe, Lightbulb, ShieldAlert, Calculator,
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
    ? 'text-[var(--color-up)] bg-[var(--color-up)]/10 border-[var(--color-up)]/30'
    : isDown
      ? 'text-[var(--color-down)] bg-[var(--color-down)]/10 border-[var(--color-down)]/30'
      : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30';

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-[#3b82f6]" />
        <h4 className="text-sm font-semibold text-main">Bối cảnh VN-Index</h4>
        <span className="text-xs text-muted ml-auto">{`Cập nhật: ${new Date().toLocaleDateString('vi-VN')}`}</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">VN-Index:</span>
          <span className="text-lg font-bold text-main">{vnindex.gia}</span>
          <span className={`text-sm font-semibold ${isUp ? 'text-[var(--color-up)]' : isDown ? 'text-[var(--color-down)]' : 'text-[var(--color-warning)]'}`}>{vnindex.thayDoi}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {vnindex.xuHuong}
        </span>
      </div>
      <p className="text-sm text-muted mt-3 leading-relaxed">{vnindex.tomTat}</p>
    </div>
  );
}

function ScenarioCard({ scenario, index }: { scenario: AnalysisResult['kichBan'][0]; index: number }) {
  const isBull = scenario.loai.toLowerCase().includes('tăng');
  const Icon = isBull ? ArrowUpCircle : ArrowDownCircle;
  const accentColor = isBull ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';
  const borderColor = isBull ? { backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.3)' } : { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' };

  return (
    <div className="border rounded-xl p-4 animate-slide-in" style={borderColor}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${accentColor}`} />
        <h4 className={`font-bold ${accentColor}`}>{scenario.loai}</h4>
      </div>
      <div className="space-y-2.5">
        <div>
          <p className="text-xs text-muted font-medium mb-0.5">Điều kiện kích hoạt</p>
          <p className="text-sm text-main leading-relaxed">{scenario.dieuKien}</p>
        </div>
        <div>
          <p className="text-xs text-muted font-medium mb-0.5">Hành động</p>
          <p className="text-sm text-main leading-relaxed">{scenario.hanhDong}</p>
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

  const actionStyle = isBuy
    ? { background: 'linear-gradient(to right, var(--color-up), #0d9668)' }
    : isHold
      ? { background: 'linear-gradient(to right, #3b82f6, #2563eb)' }
      : isReduce
        ? { background: 'linear-gradient(to right, var(--color-down), #dc2626)' }
        : { background: 'linear-gradient(to right, var(--color-warning), #d97706)' };

  const items = [
    { label: 'Điểm vào lệnh', value: khuyenNghi.diemVao, icon: Target, color: 'text-[#3b82f6]' },
    { label: 'Dừng lỗ', value: khuyenNghi.dungLo, icon: Shield, color: 'text-[var(--color-down)]' },
    { label: 'Mục tiêu', value: khuyenNghi.mucTieu, icon: TrendingUp, color: 'text-[var(--color-up)]' },
    { label: 'Tỷ trọng vốn', value: khuyenNghi.tyTrong, icon: Info, color: 'text-[var(--color-warning)]' },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-[var(--color-warning)]" />
        <h4 className="text-sm font-semibold text-main">Khuyến nghị hành động</h4>
      </div>
      <div className="inline-block px-4 py-2 rounded-xl text-white font-bold text-base mb-4" style={actionStyle}>
        {action}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 p-3 bg-input border border-default rounded-lg">
              <Icon className={`w-4 h-4 mt-0.5 ${item.color}`} />
              <div>
                <p className="text-xs text-muted font-medium">{item.label}</p>
                <p className="text-sm text-main font-medium mt-0.5">{item.value}</p>
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
      <VnIndexCard vnindex={analysis.vnindex} />

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-main">Nhận định kỹ thuật</h4>
        </div>
        <p className="text-sm text-main leading-relaxed">{analysis.nhanDinhKyThuat}</p>
      </div>

      {analysis.nhanDinhDinhLuong && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-main">Nhận định định lượng</h4>
          </div>
          <p className="text-sm text-main leading-relaxed">{analysis.nhanDinhDinhLuong}</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Target className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-main">Kịch bản giao dịch</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.kichBan.map((scenario, i) => (
            <ScenarioCard key={i} scenario={scenario} index={i} />
          ))}
        </div>
      </div>

      <RecommendationCard khuyenNghi={analysis.khuyenNghi} />

      <div className="glass-card p-5" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-[var(--color-warning)]" />
          <h4 className="text-sm font-semibold text-[var(--color-warning)]">Cảnh báo rủi ro</h4>
        </div>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-main leading-relaxed">{analysis.canhBaoRuiRo}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted font-medium">Nguồn:</span>
        {analysis.nguon.map((src, i) => (
          <span key={i} className="px-2.5 py-1 text-xs bg-surface-2 border border-default rounded-lg text-muted">{src}</span>
        ))}
      </div>
    </div>
  );
}
