import { StructuredDoc } from './decree30Formatter';
import { AgencySettings, DocumentTypeItem } from '../types';

export interface CongVanSpecs {
  TOTAL_WIDTH_CM: number;
  LEFT_COL_WIDTH_CM: number;
  RIGHT_COL_WIDTH_CM: number;
  LEFT_COL_DXA: number;
  RIGHT_COL_DXA: number;
  TOTAL_DXA: number;
  FONT_FAMILY: string;
  SUBJECT_FONT_SIZE_PT: number;
  SUBJECT_FONT_SIZE_HALF_PT: number;
}

export declare const CONG_VAN_SPECS: CongVanSpecs;
export declare const CONG_VAN_SUBJECT_REGEX: RegExp;

export declare function isCongVanDocument(
  doc: any,
  selectedType?: DocumentTypeItem | null,
  hint?: string
): boolean;

export declare function formatCongVanSubject(rawSubject: string): string;

export declare function extractCongVanSubjectFromLines(
  lines: string[],
  maxSearchLines?: number
): string;

export declare function getCongVanSubject(doc: any): string;

export declare function renderCongVanSubjectHtml(subjectText: string): string;

export declare function renderCongVanHeaderTableHtml(
  doc: any,
  settings: AgencySettings,
  helpers: {
    getStandardAgencyHeaderParts: (parentAgency?: string, agencyName?: string) => any;
    formatDocCodeForDisplay: (docCode: string, htmlMode?: boolean) => string;
  }
): string;

export declare function buildCongVanDocxHeaderRows(
  doc: any,
  settings: AgencySettings,
  docxModule: any,
  helpers: {
    getStandardAgencyHeaderParts: (parentAgency?: string, agencyName?: string) => any;
    formatDocCodeForDisplay: (docCode: string, htmlMode?: boolean) => string;
    getAutoAdjustedMottoLine?: (mottoText?: string) => string;
  }
): any[];

export declare function reconstructCongVanNormalizedText(doc: any): string;

declare const _default: {
  CONG_VAN_SPECS: CongVanSpecs;
  CONG_VAN_SUBJECT_REGEX: RegExp;
  isCongVanDocument: typeof isCongVanDocument;
  formatCongVanSubject: typeof formatCongVanSubject;
  extractCongVanSubjectFromLines: typeof extractCongVanSubjectFromLines;
  getCongVanSubject: typeof getCongVanSubject;
  renderCongVanSubjectHtml: typeof renderCongVanSubjectHtml;
  renderCongVanHeaderTableHtml: typeof renderCongVanHeaderTableHtml;
  buildCongVanDocxHeaderRows: typeof buildCongVanDocxHeaderRows;
  reconstructCongVanNormalizedText: typeof reconstructCongVanNormalizedText;
};

export default _default;
