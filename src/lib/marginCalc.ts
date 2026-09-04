// Margin loan interest calculation logic — pure functions, no DOM access.

export interface Company {
  company_code: string;
  company_name: string;
  standard_rate: number;
  day_basis: number;
  credit_limit: number | null;
  active: boolean;
}

export interface MarginPackage {
  package_id: string;
  company_code: string;
  package_name: string;
  description: string;
  promo_days: number;
  promo_rate: number;
  post_promo_rate: number;
  day_basis: number;
  credit_limit: number | null;
  has_tplus: boolean;
  active: boolean;
}

export interface NewCustomerProgram {
  program_id: string;
  company_code: string;
  program_name: string;
  days_1: number;
  rate_1: number;
  rate_2: number | null;
  standard_rate: number | null;
  credit_limit: number | null;
  day_basis: number;
  block_over_limit: boolean;
  active: boolean;
}

export interface MarketData {
  metadata: { data_updated_at: string };
  companies: Company[];
  margin_packages: MarginPackage[];
  new_customer_programs: NewCustomerProgram[];
}

export type RowCategory = "standard" | "private" | "newcustomer" | "tplus";

export interface CalcRow {
  name: string;
  annualRate: number;
  interest: number;
  limit: number | null;
  category: RowCategory;
  company: string;
}

export interface CalcResult {
  annualRate: number;
  interest: number;
}

export interface DailyCell {
  annualRate: number;
  interest: number;
}

export interface DailyExport {
  columns: string[];
  rows: { day: number; cells: DailyCell[] }[];
}

export interface LastCalculation {
  amount: number;
  days: number;
  hasPrivateRate: boolean;
  privateRate: number | null;
  eligibleNewCustomer: boolean;
  hasCompetitor: boolean;
  competitorName: string;
  competitorCode: string;
  selectedPackageName: string;
  dataUpdatedAt: string;
  rows: CalcRow[];
}

export function calculateStandard(amount: number, days: number, annualRate: number, basis: number): CalcResult {
  const interest = (amount * annualRate * days) / basis;
  return { annualRate, interest };
}

export function calculateNewCustomerProgram(
  amount: number, days: number, program: NewCustomerProgram, fallbackStandardRate: number, applyBlendedLimit: boolean
): CalcResult | null {
  if (!program) return null;
  const basis = Number(program.day_basis);
  const limit = Number(program.credit_limit || 0);
  const standardRate = Number(program.standard_rate != null ? program.standard_rate : fallbackStandardRate || 0);
  const promoAmount = applyBlendedLimit && limit > 0 ? Math.min(amount, limit) : amount;
  const excessAmount = applyBlendedLimit && limit > 0 ? Math.max(amount - limit, 0) : 0;
  const days1 = Number(program.days_1 || 0);
  const rate1 = Number(program.rate_1 || 0);
  const excessRate = program.rate_2 != null ? Number(program.rate_2) : standardRate;
  const promoDays = Math.min(days, days1);
  const postPromoDays = Math.max(days - days1, 0);
  let interest = (promoAmount * rate1 * promoDays) / basis + (promoAmount * standardRate * postPromoDays) / basis;
  interest += (excessAmount * excessRate * days) / basis;
  const averageAnnualRate = amount > 0 && days > 0 ? (interest * basis) / amount / days : 0;
  return { annualRate: averageAnnualRate, interest };
}

export function calculatePackage(amount: number, days: number, item: MarginPackage | null): CalcResult | null {
  if (!item || item.has_tplus === false) return null;
  const promoDays = Math.min(days, Number(item.promo_days || 0));
  const normalDays = Math.max(days - promoDays, 0);
  const basis = Number(item.day_basis);
  const interest = (amount * Number(item.promo_rate || 0) * promoDays) / basis
    + (amount * Number(item.post_promo_rate || 0) * normalDays) / basis;
  const averageAnnualRate = amount > 0 && days > 0 ? (interest * basis) / amount / days : 0;
  return { annualRate: averageAnnualRate, interest };
}

export function findNewCustomerProgram(data: MarketData, companyCode: string, amount: number): NewCustomerProgram | null {
  const programs = data.new_customer_programs;
  if (!Array.isArray(programs)) return null;
  const matches = programs
    .filter(p => p.company_code === companyCode && p.active === true)
    .sort((a, b) => Number(a.credit_limit || 0) - Number(b.credit_limit || 0));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  const loan = Number(amount) || 0;
  return matches.find(p => Number(p.credit_limit || 0) >= loan) || matches[matches.length - 1];
}

export function getSSINewCustomerPrograms(data: MarketData): NewCustomerProgram[] {
  return (data.new_customer_programs || [])
    .filter(p => p.company_code === "SSI" && p.active === true)
    .sort((a, b) => Number(a.credit_limit || 0) - Number(b.credit_limit || 0));
}

const CATEGORY_ORDER: Record<RowCategory, number> = { standard: 1, private: 2, newcustomer: 3, tplus: 4 };

export function sortRowsByCategory<T extends { category: RowCategory; company: string }>(rows: T[]): T[] {
  return rows.filter(Boolean).slice().sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] || 99;
    const cb = CATEGORY_ORDER[b.category] || 99;
    if (ca !== cb) return ca - cb;
    if (a.company === "SSI" && b.company !== "SSI") return -1;
    if (a.company !== "SSI" && b.company === "SSI") return 1;
    return 0;
  });
}

function makeRow(name: string, result: CalcResult, limit: number | null, category: RowCategory, company: string): CalcRow {
  return { name, annualRate: result.annualRate, interest: result.interest, limit, category, company };
}

export interface CalcInput {
  amount: number;
  days: number;
  hasPrivateRate: boolean;
  privateRate: number | null;
  eligibleNewCustomer: boolean;
  companyCode: string;
  packageId: string;
}

export interface CalcOutput {
  rows: CalcRow[];
  lastCalc: LastCalculation;
}

export function runCalculation(data: MarketData, input: CalcInput): CalcOutput {
  const { amount, days, hasPrivateRate, privateRate, eligibleNewCustomer, companyCode, packageId } = input;
  const hasCompetitor = !!companyCode;
  const ssi = data.companies.find(c => c.company_code === "SSI")!;
  const competitor = hasCompetitor ? data.companies.find(c => c.company_code === companyCode) : null;
  const ssiPackage = data.margin_packages.find(p => p.company_code === "SSI" && p.has_tplus === true && p.active === true) || null;
  const selectedPackage = (hasCompetitor && packageId) ? data.margin_packages.find(p => p.package_id === packageId) || null : null;

  const rows: CalcRow[] = [];

  rows.push(makeRow("SSI - Margin đại trà", calculateStandard(amount, days, ssi.standard_rate, ssi.day_basis), ssi.credit_limit, "standard", "SSI"));

  if (hasPrivateRate && privateRate != null) {
    rows.push(makeRow("SSI - Lãi suất riêng", calculateStandard(amount, days, privateRate / 100, ssi.day_basis), ssi.credit_limit, "private", "SSI"));
  }

  if (eligibleNewCustomer) {
    getSSINewCustomerPrograms(data).forEach(prog => {
      const blended = prog.block_over_limit !== true;
      const res = calculateNewCustomerProgram(amount, days, prog, ssi.standard_rate, blended);
      if (res) rows.push(makeRow(`SSI - ${prog.program_name}`, res, prog.credit_limit, "newcustomer", "SSI"));
    });
  }

  const ssiTPlusResult = calculatePackage(amount, days, ssiPackage);
  if (ssiTPlusResult && ssiPackage) rows.push(makeRow(ssiPackage.package_name, ssiTPlusResult, ssiPackage.credit_limit, "tplus", "SSI"));

  if (hasCompetitor && competitor) {
    rows.push(makeRow(`${competitor.company_name} - Margin đại trà`, calculateStandard(amount, days, competitor.standard_rate, competitor.day_basis), competitor.credit_limit, "standard", competitor.company_code));
    if (eligibleNewCustomer) {
      const competitorProgram = findNewCustomerProgram(data, competitor.company_code, amount);
      if (competitorProgram) {
        const competitorNewResult = calculateNewCustomerProgram(amount, days, competitorProgram, competitor.standard_rate, true);
        if (competitorNewResult) rows.push(makeRow(`${competitor.company_name} - ${competitorProgram.program_name}`, competitorNewResult, competitorProgram.credit_limit, "newcustomer", competitor.company_code));
      }
    }
    const competitorPackageResult = calculatePackage(amount, days, selectedPackage);
    if (competitorPackageResult && selectedPackage) {
      rows.push(makeRow(selectedPackage.package_name, competitorPackageResult, selectedPackage.credit_limit, "tplus", competitor.company_code));
    }
  }

  const sortedRows = sortRowsByCategory(rows);
  const lastCalc: LastCalculation = {
    amount, days, hasPrivateRate,
    privateRate: hasPrivateRate ? privateRate : null,
    eligibleNewCustomer, hasCompetitor,
    competitorName: competitor ? competitor.company_name : "",
    competitorCode: competitor ? competitor.company_code : "",
    selectedPackageName: selectedPackage?.package_name || "",
    dataUpdatedAt: data.metadata?.data_updated_at || "",
    rows: sortedRows.map(r => ({ ...r })),
  };

  return { rows: sortedRows, lastCalc };
}

export interface DailySeriesItem {
  name: string;
  category: RowCategory;
  company: string;
  calc: (day: number) => CalcResult;
}

export function buildDailySeries(
  data: MarketData,
  input: CalcInput,
  ssi: Company,
  competitor: Company | null,
  ssiPackage: MarginPackage | null,
  selectedPackage: MarginPackage | null
): DailySeriesItem[] {
  const { amount, hasPrivateRate, privateRate, eligibleNewCustomer, companyCode } = input;
  const hasCompetitor = !!companyCode && !!competitor;
  const ssiNewPrograms = eligibleNewCustomer ? getSSINewCustomerPrograms(data) : [];
  const competitorNewProgram = (hasCompetitor && eligibleNewCustomer) ? findNewCustomerProgram(data, competitor.company_code, amount) : null;
  const competitorHasTplus = hasCompetitor && selectedPackage && selectedPackage.has_tplus;

  const rawSeries: DailySeriesItem[] = [
    { name: "SSI - Margin đại trà", category: "standard", company: "SSI", calc: d => calculateStandard(amount, d, ssi.standard_rate, ssi.day_basis) },
    ...(hasPrivateRate && privateRate != null ? [{ name: "SSI - Lãi suất riêng", category: "private" as RowCategory, company: "SSI", calc: (d: number) => calculateStandard(amount, d, privateRate / 100, ssi.day_basis) }] : []),
    ...ssiNewPrograms.map(prog => ({ name: `SSI - ${prog.program_name}`, category: "newcustomer" as RowCategory, company: "SSI", calc: (d: number) => calculateNewCustomerProgram(amount, d, prog, ssi.standard_rate, prog.block_over_limit !== true)! })),
    ...(ssiPackage ? [{ name: ssiPackage.package_name, category: "tplus" as RowCategory, company: "SSI", calc: (d: number) => calculatePackage(amount, d, ssiPackage)! }] : []),
    ...(hasCompetitor && competitor ? [{ name: `${competitor.company_name} - Margin đại trà`, category: "standard" as RowCategory, company: competitor.company_code, calc: (d: number) => calculateStandard(amount, d, competitor.standard_rate, competitor.day_basis) }] : []),
    ...(competitorNewProgram ? [{ name: `${competitor!.company_name} - ${competitorNewProgram.program_name}`, category: "newcustomer" as RowCategory, company: competitor!.company_code, calc: (d: number) => calculateNewCustomerProgram(amount, d, competitorNewProgram, competitor!.standard_rate, true)! }] : []),
    ...(competitorHasTplus && selectedPackage ? [{ name: selectedPackage.package_name, category: "tplus" as RowCategory, company: competitor!.company_code, calc: (d: number) => calculatePackage(amount, d, selectedPackage)! }] : []),
  ];

  return sortRowsByCategory(rawSeries);
}

export function renderDailyTable(amount: number, maxDays: number, series: DailySeriesItem[]): DailyExport {
  const exportRows: { day: number; cells: DailyCell[] }[] = [];
  for (let day = 1; day <= maxDays; day++) {
    const cells: DailyCell[] = series.map(s => {
      const result = s.calc(day);
      return { annualRate: result.annualRate, interest: result.interest };
    });
    exportRows.push({ day, cells });
  }
  return { columns: series.map(s => s.name), rows: exportRows };
}

export function validateNewCustomerLimit(
  data: MarketData,
  eligibleNewCustomer: boolean,
  hasPrivateRate: boolean,
  amount: number
): { valid: boolean; message?: string } {
  if (!eligibleNewCustomer || hasPrivateRate) return { valid: true };
  const blockPrograms = getSSINewCustomerPrograms(data).filter(p => p.block_over_limit === true);
  if (blockPrograms.length === 0) return { valid: true };
  const offending = blockPrograms.find(p => Number(p.credit_limit || 0) > 0 && amount > Number(p.credit_limit || 0));
  if (offending) {
    const limit = Number(offending.credit_limit || 0);
    return {
      valid: false,
      message: `Số tiền vay vượt hạn mức gói ưu đãi "${offending.program_name}" của SSI (tối đa ${formatCompactMoney(limit)}). Vui lòng nhập từ ${formatCompactMoney(limit)} trở xuống.`,
    };
  }
  return { valid: true };
}

// ===== Formatting helpers =====

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatCompactMoney(value: number): string {
  if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 2)} tỷ đồng`;
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000, 2)} triệu đồng`;
  return formatCurrency(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: decimals }).format(value);
}

export function formatDataDate(value: string): string {
  const text = String(value || "").trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  return text;
}
