import { AgencySettings } from '../types';

export interface OfficerSalutation {
  name: string;
  title: string;
  greetingPrefix: string;
  hasCustomOfficer: boolean;
  salutationText: string;
  greetingIntro: string;
  shortName: string;
  pronoun: string;
}

/**
 * Lấy thông tin danh xưng và lời chào cá nhân hóa cho Tiểu Bảo Bối
 */
export function getOfficerSalutation(settings?: AgencySettings): OfficerSalutation {
  const name = settings?.officerName?.trim() || '';
  const title = settings?.officerTitle?.trim() || '';
  const prefix = settings?.officerGreetingPrefix?.trim() || 'đồng chí';

  if (!name) {
    return {
      name: '',
      title: title || '',
      greetingPrefix: prefix,
      hasCustomOfficer: false,
      salutationText: 'chào đồng chí',
      greetingIntro: 'Dạ, chào đồng chí!',
      shortName: 'đồng chí',
      pronoun: 'đồng chí'
    };
  }

  // Tách tên gọi ngắn gọn (tên chính cuối cùng)
  const nameParts = name.split(/\s+/).filter(Boolean);
  const givenName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : name;

  let salutationText = '';
  let greetingIntro = '';
  let shortName = '';
  let pronoun = prefix;

  if (prefix.toLowerCase() === 'anh' || prefix.toLowerCase() === 'chị' || prefix.toLowerCase() === 'em') {
    pronoun = prefix;
  }

  if (title) {
    // Có cả chức danh và họ tên: e.g. "Chuyên viên Nguyễn Thị Mai" hoặc "Phó Chủ tịch Lê Thế Điệp"
    salutationText = `chào ${title} ${name}`;
    greetingIntro = `Dạ, chào ${title} ${name}!`;
    shortName = `${title} ${givenName}`;
  } else {
    // Chỉ có họ tên và tiền tố xưng hô: e.g. "đồng chí Nguyễn Thị Mai" hoặc "chị Mai"
    salutationText = `chào ${prefix} ${name}`;
    greetingIntro = `Dạ, chào ${prefix} ${name}!`;
    shortName = `${prefix} ${givenName}`;
  }

  return {
    name,
    title,
    greetingPrefix: prefix,
    hasCustomOfficer: true,
    salutationText,
    greetingIntro,
    shortName,
    pronoun
  };
}
