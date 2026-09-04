import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator, RefreshCw, Download, Loader2, TrendingDown, Award,
  Info, AlertCircle, Calendar, Wallet, ChevronRight, ThumbsUp,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { buildXlsx, downloadXlsx, fileStamp, round2 } from '@/lib/xlsx';
import {
  type MarketData, type CalcRow, type LastCalculation, type DailyExport,
  type DailySeriesItem,
  runCalculation, buildDailySeries, renderDailyTable, validateNewCustomerLimit,
  getSSINewCustomerPrograms, findNewCustomerProgram,
  formatPercent, formatCurrency, formatCompactMoney, formatDataDate,
} from '@/lib/marginCalc';

const DATA_URL = '/margin_market_data.json';

export default function MarginCalculator() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [dataStatus, setDataStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [dataVersion, setDataVersion] = useState('');

  const [loanAmount, setLoanAmount] = useState('500.000.000');
  const [loanAmountText, setLoanAmountText] = useState('500 triệu đồng');
  const [loanDays, setLoanDays] = useState('30');
  const [companyCode, setCompanyCode] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [hasPrivateRate, setHasPrivateRate] = useState('false');
  const [privateRate, setPrivateRate] = useState('');
  const [eligibleNewCustomer, setEligibleNewCustomer] = useState('true');

  const [formMessage, setFormMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [canCalculate, setCanCalculate] = useState(false);

  const [resultRows, setResultRows] = useState<CalcRow[]>([]);
  const [lastCalc, setLastCalc] = useState<LastCalculation | null>(null);
  const [dailyExport, setDailyExport] = useState<DailyExport | null>(null);
  const [dailySeries, setDailySeries] = useState<DailySeriesItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [exportStatus, setExportStatus] = useState('Tính toán trước khi xuất Excel.');
  const [exportButtonText, setExportButtonText] = useState('Xuất Excel');
  const [exportSuccess, setExportSuccess] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  // Load market data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDataStatus('loading');
      try {
        const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MarketData = await res.json();
        if (cancelled) return;
        setMarketData(data);
        const updated = data.metadata?.data_updated_at;
        setDataVersion(updated ? `Dữ liệu cập nhật đến ${formatDataDate(updated)}` : 'Dữ liệu cập nhật đến: chưa khai báo');
        setDataStatus('success');
        setCanCalculate(true);
      } catch {
        if (cancelled) return;
        setDataStatus('error');
        setFormMessage({ text: 'Không thể tải dữ liệu thị trường. Vui lòng tải lại trang.', type: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync new customer offer eligibility
  useEffect(() => {
    if (hasPrivateRate === 'true') {
      setEligibleNewCustomer('false');
    }
  }, [hasPrivateRate]);

  // Validate new customer limit
  useEffect(() => {
    if (!marketData) return;
    const amount = Number(loanAmount.replace(/\D/g, ''));
    const eligible = hasPrivateRate !== 'true' && eligibleNewCustomer === 'true';
    const check = validateNewCustomerLimit(marketData, eligible, hasPrivateRate === 'true', amount);
    if (!check.valid) {
      setFormMessage({ text: check.message || '', type: 'error' });
      setCanCalculate(false);
    } else {
      setCanCalculate(true);
      if (formMessage?.type === 'error' && formMessage.text.includes('hạn mức')) {
        setFormMessage(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, hasPrivateRate, eligibleNewCustomer, marketData]);

  const handleLoanAmountInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setLoanAmount('');
      setLoanAmountText('');
      return;
    }
    const amount = Number(digits);
    setLoanAmount(new Intl.NumberFormat('vi-VN').format(amount));
    setLoanAmountText(formatCompactMoney(amount));
  }, []);

  const handleCompanyChange = useCallback((code: string) => {
    setCompanyCode(code);
    setPackageId('');
    setPackageDescription('');
    if (!marketData || !code) return;
    const packages = marketData.margin_packages.filter(p => p.company_code === code && p.active === true);
    if (packages.length > 0) {
      setPackageId(packages[0].package_id);
      const item = packages[0];
      setPackageDescription(item.has_tplus === false ? 'Công ty này không có sản phẩm T+ trong bộ dữ liệu.' : (item.description || ''));
    }
  }, [marketData]);

  const handlePackageChange = useCallback((pkgId: string) => {
    setPackageId(pkgId);
    if (!marketData) return;
    const item = marketData.margin_packages.find(p => p.package_id === pkgId);
    setPackageDescription(item ? (item.has_tplus === false ? 'Công ty này không có sản phẩm T+ trong bộ dữ liệu.' : (item.description || '')) : '');
  }, [marketData]);

  const handleCalculate = useCallback(() => {
    if (!marketData) return;
    setFormMessage(null);

    const amount = Number(loanAmount.replace(/\D/g, ''));
    const days = Number(loanDays);

    if (!amount || amount <= 0) { setFormMessage({ text: 'Vui lòng nhập số tiền vay lớn hơn 0.', type: 'error' }); return; }
    if (!Number.isInteger(days) || days < 1 || days > 90) { setFormMessage({ text: 'Số ngày vay phải từ 1 đến 90.', type: 'error' }); return; }

    const eligible = hasPrivateRate !== 'true' && eligibleNewCustomer === 'true';
    const limitCheck = validateNewCustomerLimit(marketData, eligible, hasPrivateRate === 'true', amount);
    if (!limitCheck.valid) { setFormMessage({ text: limitCheck.message || '', type: 'error' }); return; }

    if (hasPrivateRate === 'true') {
      const pr = Number(privateRate);
      if (!Number.isFinite(pr) || pr <= 0) { setFormMessage({ text: 'Vui lòng nhập lãi suất riêng lớn hơn 0.', type: 'error' }); return; }
    }

    const input = {
      amount, days,
      hasPrivateRate: hasPrivateRate === 'true',
      privateRate: hasPrivateRate === 'true' ? Number(privateRate) : null,
      eligibleNewCustomer: eligible,
      companyCode, packageId,
    };

    const { rows, lastCalc } = runCalculation(marketData, input);
    const ssi = marketData.companies.find(c => c.company_code === 'SSI')!;
    const competitor = companyCode ? (marketData.companies.find(c => c.company_code === companyCode) || null) : null;
    const ssiPackage = marketData.margin_packages.find(p => p.company_code === 'SSI' && p.has_tplus === true && p.active === true) || null;
    const selectedPackage = (companyCode && packageId) ? marketData.margin_packages.find(p => p.package_id === packageId) || null : null;

    const series = buildDailySeries(marketData, input, ssi, competitor, ssiPackage, selectedPackage);
    const daily = renderDailyTable(amount, days, series);

    setResultRows(rows);
    setLastCalc(lastCalc);
    setDailyExport(daily);
    setDailySeries(series);
    setShowResults(true);
    setExportStatus('Có thể xuất toàn bộ dữ liệu ra file Excel (3 sheet).');
    setExportButtonText('Xuất Excel');
    setExportSuccess(false);

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [marketData, loanAmount, loanDays, hasPrivateRate, privateRate, eligibleNewCustomer, companyCode, packageId]);

  const handleReset = useCallback(() => {
    setHasPrivateRate('false');
    setPrivateRate('');
    setEligibleNewCustomer('true');
    setLoanAmount('500.000.000');
    setLoanAmountText('500 triệu đồng');
    setLoanDays('30');
    setCompanyCode('');
    setPackageId('');
    setPackageDescription('');
    setShowResults(false);
    setLastCalc(null);
    setDailyExport(null);
    setResultRows([]);
    setExportStatus('Tính toán trước khi xuất Excel.');
    setExportButtonText('Xuất Excel');
    setFormMessage(null);
    if (marketData) setCanCalculate(true);
  }, [marketData]);

  const handleExport = useCallback(() => {
    if (!lastCalc || !dailyExport) {
      setExportStatus('Vui lòng tính toán trước khi xuất Excel.');
      return;
    }
    try {
      const lc = lastCalc;
      const exportedAt = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const exportedAtText = `${pad(exportedAt.getDate())}/${pad(exportedAt.getMonth() + 1)}/${exportedAt.getFullYear()} ${pad(exportedAt.getHours())}:${pad(exportedAt.getMinutes())}`;

      const infoRows: (string | number)[][] = [
        ['THÔNG TIN ĐẦU VÀO MÔ PHỎNG', ''],
        ['', ''],
        ['Số tiền vay (VND)', Math.round(lc.amount)],
        ['Số ngày vay (ngày)', lc.days],
        ['Khách hàng có lãi suất riêng', lc.hasPrivateRate ? 'Có' : 'Không'],
        ['Mức lãi suất riêng (%/năm)', lc.hasPrivateRate ? round2(lc.privateRate || 0) : 'Không áp dụng'],
        ['Hưởng ưu đãi khách hàng mới', lc.eligibleNewCustomer ? 'Có' : 'Không'],
        ['CTCK so sánh', lc.hasCompetitor ? lc.competitorName : 'Không so sánh (chỉ xem SSI)'],
        ['Gói Margin T+ được chọn', lc.selectedPackageName || 'Không áp dụng'],
        ['Dữ liệu thị trường cập nhật đến', lc.dataUpdatedAt ? formatDataDate(lc.dataUpdatedAt) : 'Chưa khai báo'],
        ['Thời điểm xuất file', exportedAtText],
        ['', ''],
        ['Ghi chú', 'Kết quả chỉ phục vụ mục đích mô phỏng và tham khảo, không phải khuyến nghị đầu tư.'],
      ];

      const sheet1Rows: (string | number)[][] = [
        ['Sản phẩm', 'Lãi suất bình quân (%/năm)', 'Lãi vay cộng dồn (VND)', 'Hạn mức (VND)'],
        ...lc.rows.map(r => [r.name, round2(r.annualRate * 100), Math.round(r.interest), r.limit ? Math.round(r.limit) : '']),
      ];

      const header2: (string | number)[] = ['Ngày vay'];
      dailyExport.columns.forEach(name => { header2.push(`${name} - LSBQ/năm (%)`); header2.push(`${name} - Lãi cộng dồn (VND)`); });
      const sheet2Rows: (string | number)[][] = [header2];
      dailyExport.rows.forEach(dr => {
        const row: (string | number)[] = [dr.day];
        dr.cells.forEach(c => { row.push(round2(c.annualRate * 100)); row.push(Math.round(c.interest)); });
        sheet2Rows.push(row);
      });

      const bytes = buildXlsx([
        { name: 'Thong tin dau vao', rows: infoRows },
        { name: 'So sanh san pham', rows: sheet1Rows },
        { name: 'Mo phong theo ngay', rows: sheet2Rows },
      ]);
      downloadXlsx(bytes, `Margin_Simulation_${fileStamp()}.xlsx`);

      setExportButtonText('Đã xuất Excel');
      setExportStatus('Đã tải file Excel gồm 3 sheet: Thông tin đầu vào, So sánh sản phẩm & Mô phỏng theo ngày.');
      setExportSuccess(true);
      setTimeout(() => { setExportButtonText('Xuất Excel'); setExportSuccess(false); }, 2500);
    } catch {
      setExportStatus('Không thể xuất Excel. Vui lòng thử lại.');
    }
  }, [lastCalc, dailyExport]);

  const validRows = resultRows.filter(Boolean);
  const bestRow = validRows.length > 0 ? validRows.reduce((a, b) => a.interest <= b.interest ? a : b) : null;
  const competitorName = companyCode && marketData ? marketData.companies.find(c => c.company_code === companyCode)?.company_name || null : null;

  // Insight generation
  const insights = generateInsights(validRows, bestRow, Number(loanAmount.replace(/\D/g, '')) || 0, Number(loanDays), competitorName);

  const availableCompanies = marketData
    ? marketData.companies.filter(c => c.active === true && c.company_code !== 'SSI').sort((a, b) => a.company_name.localeCompare(b.company_name, 'vi'))
    : [];
  const availablePackages = marketData && companyCode
    ? marketData.margin_packages.filter(p => p.company_code === companyCode && p.active === true)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e1061e, #b30518)' }}>
            <Calculator className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-main">Tính toán lãi Margin</h2>
            <p className="text-xs text-muted">So sánh lãi suất Margin tại SSI và các công ty chứng khoán khác</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {dataStatus === 'loading' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /><span className="text-muted">Đang tải dữ liệu thị trường...</span></>}
          {dataStatus === 'success' && <><span className="w-2 h-2 rounded-full bg-[var(--color-up)]" /><span className="text-muted">{dataVersion}</span></>}
          {dataStatus === 'error' && <><AlertCircle className="w-3.5 h-3.5 text-[var(--color-down)]" /><span className="text-[var(--color-down)]">Không tải được dữ liệu</span></>}
        </div>
      </div>

      {/* Input form */}
      <div className="glass-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-main flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Thông tin khoản vay
        </h3>

        {/* Loan amount */}
        <div>
          <label className="text-xs text-muted font-medium">Số tiền vay (VND)</label>
          <input
            type="text"
            value={loanAmount}
            onChange={(e) => handleLoanAmountInput(e.target.value)}
            placeholder="500.000.000"
            className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors"
          />
          {loanAmountText && <p className="text-xs text-dim mt-1">{loanAmountText}</p>}
        </div>

        {/* Loan days */}
        <div>
          <label className="text-xs text-muted font-medium">Số ngày vay (1–90)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={loanDays}
            onChange={(e) => setLoanDays(e.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Has private rate */}
        <div>
          <label className="text-xs text-muted font-medium">Có lãi suất riêng?</label>
          <div className="mt-1 flex gap-1 p-1 bg-surface-2 rounded-lg">
            <button
              onClick={() => setHasPrivateRate('false')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${hasPrivateRate === 'false' ? 'bg-input text-main shadow-sm' : 'text-muted'}`}
            >Không</button>
            <button
              onClick={() => setHasPrivateRate('true')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${hasPrivateRate === 'true' ? 'bg-input text-main shadow-sm' : 'text-muted'}`}
            >Có</button>
          </div>
        </div>

        {/* Private rate */}
        {hasPrivateRate === 'true' && (
          <div className="animate-fade-in">
            <label className="text-xs text-muted font-medium">Mức lãi suất riêng (%/năm)</label>
            <input
              type="number"
              step="0.01"
              value={privateRate}
              onChange={(e) => setPrivateRate(e.target.value)}
              placeholder="13.5"
              className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-dim mt-1">Chương trình ưu đãi khách hàng mới chỉ áp dụng với lãi suất đại trà.</p>
          </div>
        )}

        {/* Eligible new customer */}
        {hasPrivateRate !== 'true' && (
          <div className="animate-fade-in">
            <label className="text-xs text-muted font-medium">Hưởng ưu đãi khách hàng mới?</label>
            <div className="mt-1 flex gap-1 p-1 bg-surface-2 rounded-lg">
              <button
                onClick={() => setEligibleNewCustomer('false')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${eligibleNewCustomer === 'false' ? 'bg-input text-main shadow-sm' : 'text-muted'}`}
              >Không</button>
              <button
                onClick={() => setEligibleNewCustomer('true')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${eligibleNewCustomer === 'true' ? 'bg-input text-main shadow-sm' : 'text-muted'}`}
              >Có</button>
            </div>
            <p className="text-xs text-dim mt-1">Lãi suất đại trà 13,5%/năm</p>
          </div>
        )}

        {/* Company select */}
        <div>
          <label className="text-xs text-muted font-medium">Công ty chứng khoán so sánh</label>
          <select
            value={companyCode}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors"
          >
            <option value="">Không so sánh (chỉ xem SSI)</option>
            {availableCompanies.map(c => (
              <option key={c.company_code} value={c.company_code}>{c.company_name}</option>
            ))}
          </select>
        </div>

        {/* Package select */}
        {companyCode && availablePackages.length > 0 && (
          <div className="animate-fade-in">
            <label className="text-xs text-muted font-medium">Gói Margin T+</label>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors"
            >
              {availablePackages.map(p => (
                <option key={p.package_id} value={p.package_id}>{p.package_name}</option>
              ))}
            </select>
            {packageDescription && <p className="text-xs text-dim mt-1">{packageDescription}</p>}
          </div>
        )}

        {/* Form message */}
        {formMessage && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm animate-fade-in ${formMessage.type === 'error' ? 'bg-[var(--color-down)]/10 text-[var(--color-down)] border border-[var(--color-down)]/30' : 'bg-[var(--color-up)]/10 text-[var(--color-up)] border border-[var(--color-up)]/30'}`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formMessage.text}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate || dataStatus !== 'success'}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(to right, #e1061e, #b30518)' }}
          >
            <Calculator className="w-4 h-4" />
            Tính toán
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-default bg-surface text-sm font-medium text-muted hover:text-main hover:border-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Làm lại</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && bestRow && (
        <div ref={resultRef} className="space-y-4 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-card p-4" style={{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.03)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-[var(--color-up)]" />
                <p className="text-xs text-muted">Chi phí thấp nhất</p>
              </div>
              <p className="text-lg font-bold text-main">{formatCurrency(bestRow.interest)}</p>
              <p className="text-xs text-dim mt-0.5">{bestRow.name}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs text-muted">Số tiền vay</p>
              </div>
              <p className="text-lg font-bold text-main">{formatCompactMoney(Number(loanAmount.replace(/\D/g, '')))}</p>
              <p className="text-xs text-dim mt-0.5">Giá trị mô phỏng</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs text-muted">Số ngày vay</p>
              </div>
              <p className="text-lg font-bold text-main">{loanDays} ngày</p>
              <p className="text-xs text-dim mt-0.5">Tối đa 90 ngày</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Calculator className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs text-muted">Số phương án</p>
              </div>
              <p className="text-lg font-bold text-main">{validRows.length}</p>
              <p className="text-xs text-dim mt-0.5">Đang được so sánh</p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-main mb-3">So sánh các phương án</h3>
            <p className="text-xs text-muted mb-4">
              Khoản vay {formatCurrency(Number(loanAmount.replace(/\D/g, '')))} trong {loanDays} ngày{competitorName ? `; so sánh với ${competitorName}.` : '; các phương án Margin tại SSI.'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-muted">Sản phẩm</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted">LSBQ/năm</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted">Lãi cộng dồn</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted">Hạn mức</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((r, i) => {
                    const isBest = r === bestRow;
                    const isSSI = r.company === "SSI";
                    return (
                      <tr key={i} className="border-b border-default" style={isBest ? { backgroundColor: 'rgba(16,185,129,0.05)' } : undefined}>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isBest ? 'text-main font-bold' : 'text-main'}`}>{r.name}</span>
                            {isBest && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--color-up)' }}>
                                <ThumbsUp className="w-2.5 h-2.5" /> Tốt nhất
                              </span>
                            )}
                            {isSSI && !isBest && <span className="text-[10px] text-dim">SSI</span>}
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-2 font-medium text-main">{formatPercent(r.annualRate)}</td>
                        <td className="text-right py-2.5 px-2 font-bold text-main">{formatCurrency(r.interest)}</td>
                        <td className="text-right py-2.5 px-2 text-muted">{r.limit ? formatCompactMoney(r.limit) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="glass-card p-5" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#3b82f6]" />
                <h3 className="text-sm font-semibold text-main">Nhận xét nhanh</h3>
              </div>
              <div className="space-y-2">
                {insights.map((p, i) => (
                  <p key={i} className="text-sm text-main leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            </div>
          )}

          {/* Daily table */}
          {dailyExport && dailySeries.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-main mb-1">Mô phỏng lãi theo ngày</h3>
              <p className="text-xs text-muted mb-4">Lãi suất bình quân và lãi cộng dồn cho từng ngày vay</p>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-default px-2 py-1.5 text-left text-muted font-semibold sticky left-0 bg-input">Ngày</th>
                      {dailySeries.map((s, i) => (
                        <th key={i} colSpan={2} className="border border-default px-2 py-1.5 text-center text-muted font-semibold" style={s.company === 'SSI' ? { borderTop: '3px solid #e1061e' } : undefined}>
                          {s.name}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {dailySeries.map((_, i) => (
                        <React.Fragment key={i}>
                          <th className="border border-default px-2 py-1 text-center text-dim font-medium">LSBQ</th>
                          <th className="border border-default px-2 py-1 text-center text-dim font-medium">Lãi dồn</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyExport.rows.map((dr) => (
                      <tr key={dr.day}>
                        <td className="border border-default px-2 py-1 text-muted font-medium sticky left-0 bg-input">{dr.day}</td>
                        {dr.cells.map((c, i) => (
                          <React.Fragment key={i}>
                            <td className="border border-default px-2 py-1 text-right text-muted">{formatPercent(c.annualRate)}</td>
                            <td className="border border-default px-2 py-1 text-right text-main font-medium">{formatCurrency(c.interest)}</td>
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export button */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Download className={`w-5 h-5 ${exportSuccess ? 'text-[var(--color-up)]' : 'text-primary'}`} />
                <div>
                  <button
                    onClick={handleExport}
                    disabled={!lastCalc}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${exportSuccess ? 'text-[var(--color-up)]' : 'text-primary hover:opacity-80'} disabled:opacity-50`}
                  >
                    {exportButtonText}
                  </button>
                  <p className="text-xs text-dim mt-1">{exportStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function generateInsights(rows: CalcRow[], best: CalcRow | null, amount: number, days: number, competitorName: string | null): string[] {
  if (!best || rows.length === 0) return [];
  const ssiRows = rows.filter(r => r.company === "SSI");
  const points: string[] = [];

  const savingVsWorst = rows.reduce((m, r) => Math.max(m, r.interest), 0) - best.interest;
  points.push(
    `Với khoản vay <strong>${formatCompactMoney(amount)}</strong> trong <strong>${days} ngày</strong>, phương án có chi phí lãi thấp nhất là <strong>${best.name}</strong> — chỉ khoảng <strong>${formatCurrency(best.interest)}</strong> (lãi suất bình quân ${formatPercent(best.annualRate)}).`
    + (savingVsWorst > 0 ? ` So với phương án cao nhất trong bảng, bạn có thể tiết kiệm tới <strong>${formatCurrency(savingVsWorst)}</strong>.` : "")
  );

  const ssiBest = ssiRows.length ? ssiRows.reduce((a, b) => a.interest <= b.interest ? a : b) : null;
  if (ssiBest) {
    if (best.company === "SSI") {
      points.push(`Đây cũng chính là lợi thế của <strong>SSI</strong>: mức chi phí cạnh tranh nhất trong lần so sánh này, đi kèm nền tảng giao dịch và uy tín thương hiệu hàng đầu thị trường.`);
    } else {
      points.push(
        `Ở phía <strong>SSI</strong>, phương án đáng chú ý nhất là <strong>${ssiBest.name}</strong> với lãi suất bình quân ${formatPercent(ssiBest.annualRate)} (khoảng ${formatCurrency(ssiBest.interest)})`
        + (ssiBest.limit ? `, hạn mức lên tới ${formatCompactMoney(ssiBest.limit)}` : "")
        + `. Đây là lựa chọn hấp dẫn nếu bạn ưu tiên sự an tâm về thương hiệu, chất lượng dịch vụ và hệ sinh thái đầu tư đồng bộ của SSI.`
      );
    }
  }

  const margin0Row = ssiRows.find(r => /margin\s*0\.?0/i.test(r.name));
  const bestIsNewCustomer = best.category === "newcustomer";
  if (bestIsNewCustomer && !margin0Row) {
    points.push(`Nếu bạn là khách hàng mới, các gói ưu đãi giai đoạn đầu như trên giúp tối ưu chi phí rõ rệt trong thời gian đầu vay. Bạn nên lưu ý mức lãi suất và hạn mức áp dụng để chọn gói phù hợp với nhu cầu.`);
  } else if (!bestIsNewCustomer && best.limit) {
    points.push(`Bên cạnh chi phí, bạn cũng nên cân nhắc hạn mức để đảm bảo đáp ứng đủ nhu cầu vay của mình.`);
  }

  if (margin0Row && margin0Row !== best) {
    points.push(`Đặc biệt, nếu bạn là <strong>khách hàng mới hoặc không phát sinh dư nợ trong vòng 180 ngày</strong> và có <strong>nhu cầu vay ít</strong>, thì <strong>${margin0Row.name}</strong> (hoàn 100% lãi vay trên dư nợ tối đa 50 triệu/ngày) sẽ là lựa chọn phù hợp nhất để tối ưu chi phí.`);
  }

  return points;
}
