import nd30Rules from '../rules/nd30.json';
import hd05Rules from '../rules/hd05.json';
import thesisRules from '../rules/academic/thesis.json';
import reportRules from '../rules/academic/report.json';
import journalRules from '../rules/academic/journal.json';
import docTypesCatalog from '../rules/doc-types.json';

export interface DocumentRuleConfig {
  system: string;
  legalBasis: string;
  paper: {
    size: string;
    widthMm: number;
    heightMm: number;
    orientation: string;
  };
  marginsMm: {
    top: { min: number; max: number; default: number } | number;
    bottom: { min: number; max: number; default: number } | number;
    left: { min: number; max: number; default: number } | number;
    right: { min: number; max: number; default: number } | number;
  };
  typography: {
    fontFamily: string;
    encoding: string;
    color?: string;
    bodySizePt?: number;
    bodyLineSpacing?: number;
    firstLineIndentCm?: number;
    align?: string;
  };
  elements?: Record<string, any>;
  headings?: Record<string, any>;
  tableFigure?: Record<string, any>;
  protectedNodes?: string[];
  issnProfile?: {
    journalName: string;
    issn: string;
  };
}

const STORAGE_CUSTOM_RULES_KEY = 'trolyvanthu_custom_rules_v1';

export class RuleLoader {
  /**
   * Lấy cấu hình quy tắc thể thức chính thức theo hệ văn bản
   */
  static getRule(system: 'hanh_chinh' | 'dang' | 'academic', academicSubtype?: 'thesis' | 'report' | 'journal'): DocumentRuleConfig {
    // 1. Kiểm tra nếu người dùng đã tùy biến hoặc nạp quy tắc riêng trong localStorage
    try {
      const customRulesRaw = localStorage.getItem(STORAGE_CUSTOM_RULES_KEY);
      if (customRulesRaw) {
        const customRules = JSON.parse(customRulesRaw);
        const key = system === 'academic' ? `academic_${academicSubtype || 'thesis'}` : system;
        if (customRules[key]) {
          return customRules[key];
        }
      }
    } catch (e) {
      console.warn('Lỗi khi đọc custom rules từ localStorage:', e);
    }

    // 2. Nạp từ file cấu hình chính thức (Không tự bịa thông số)
    if (system === 'hanh_chinh') {
      return nd30Rules as unknown as DocumentRuleConfig;
    }

    if (system === 'dang') {
      return hd05Rules as unknown as DocumentRuleConfig;
    }

    if (system === 'academic') {
      if (academicSubtype === 'report') return reportRules as unknown as DocumentRuleConfig;
      if (academicSubtype === 'journal') return journalRules as unknown as DocumentRuleConfig;
      return thesisRules as unknown as DocumentRuleConfig;
    }

    return nd30Rules as unknown as DocumentRuleConfig;
  }

  /**
   * Lưu cấu hình quy tắc mới do người dùng nạp từ văn bản gốc (PDF/Phụ lục)
   */
  static saveCustomRule(key: string, rule: DocumentRuleConfig): void {
    try {
      const existing = localStorage.getItem(STORAGE_CUSTOM_RULES_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed[key] = rule;
      localStorage.setItem(STORAGE_CUSTOM_RULES_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.error('Lỗi khi lưu custom rule:', e);
    }
  }

  /**
   * Xóa quy tắc tùy biến và khôi phục về bản gốc của Nghị định / Hướng dẫn
   */
  static resetToOfficialRules(): void {
    try {
      localStorage.removeItem(STORAGE_CUSTOM_RULES_KEY);
    } catch (e) {
      console.error('Lỗi khi reset rules:', e);
    }
  }

  /**
   * Lấy danh mục phân loại văn bản (Thường dùng / Ít dùng / Ghim yêu thích)
   */
  static getDocTypesCatalog() {
    return docTypesCatalog;
  }
}
