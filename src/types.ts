export type DocCategory = 'hanh_chinh' | 'dang' | 'hoc_thuat';

export interface DocumentTypeItem {
  id: string;
  name: string;
  category: DocCategory;
  shortDesc: string;
  isPopular?: boolean;
  codePrefix: string;
  standardStructure: string;
  defaultTemplate: string;
  decreeRef: string;
}

export interface AgencySettings {
  agencyName: string; // Tên cơ quan ban hành, e.g. "ỦY BAN NHÂN DÂN PHƯỜNG ĐÔNG TIẾN"
  shortLocation: string; // Địa danh viết tắt, e.g. "Đông Tiến"
  parentAgency?: string; // Cơ quan cấp trên, e.g. "ỦY BAN NHÂN DÂN THỊ XÃ BỈM SƠN"
  signerTitle?: string; // e.g. "CHỦ TỊCH"
  signerName?: string; // e.g. "Nguyễn Văn Hùng"
  department?: string; // e.g. "Văn phòng HĐND & UBND"
  geminiApiKey?: string; // Optional custom Gemini key
}

export interface DetectedElements {
  agencyName: string | null;
  parentAgency: string | null;
  docTypeName: string | null;
  docCode: string | null;
  location: string | null;
  dateStr: string | null;
  countryHeader: string | null;
  motto: string | null;
  subject: string | null;
  recipients: string[];
  signerAuthority: string | null;
  signerTitle: string | null;
  signerName: string | null;
}

export interface ReviewIssue {
  id: string;
  type: 'can_xem_lai' | 'can_sua';
  title: string;
  count: number;
  description: string;
  examples: Array<{ snippet: string; countWords?: number; suggestion?: string }>;
  basis: string; // "Căn cứ: Văn phong hành chính...", "Căn cứ: Rà soát trước khi ký"...
}

export interface AutoFixItem {
  id: string;
  title: string;
  count?: number;
  description: string;
}

export interface PassedItem {
  id: string;
  title: string;
  detail?: string;
}

export interface DocumentAnalysisReport {
  detected: DetectedElements;
  missingInDoc: string[]; // e.g. ['Địa danh', 'Ngày', 'Tháng', 'Năm', 'Số văn bản', 'Kính gửi', 'Nơi nhận']
  reviewIssues: ReviewIssue[];
  autoFixItems: AutoFixItem[];
  passedItems: PassedItem[];
  summaryText: string;
}

export interface NormalizeResult {
  diemTruoc: number;
  diemSau: number;
  soLoi: number;
  danhSachLoi: string[];
  canhBaoCoQuan: string | null;
  noiDungChuanHoa: string;
  goiY: string[];
  detectedAgencyInDoc?: string;
  detectedLocationInDoc?: string;
  spellingErrors?: Array<{ wrong: string; right: string; context?: string }>;
  formatErrors?: string[];
  styleErrors?: string[];
  analysisReport?: DocumentAnalysisReport;
}

export type AppTab = 'home' | 'normalize' | 'templates' | 'academic' | 'guidelines' | 'settings';
export type StepNumber = 1 | 2 | 3 | 4;
