export const GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
];

export const GRADE_SECTION_MAP = {
  'Pre-Kinder': 'Love',
  Kindergarten: 'Joy',
  'Grade 1': 'Faith',
  'Grade 2': 'Grace',
  'Grade 3': 'Hope',
  'Grade 4': 'Peace',
  'Grade 5': 'Patience',
  'Grade 6': 'Kindness',
  'Grade 7': 'Goodness',
  'Grade 8': 'Faithfulness',
  'Grade 9': 'Gentleness',
  'Grade 10': 'Self-Control',
};

export function resolveSection(gradeLevel, fallback = 'Faith') {
  if (!gradeLevel) return fallback;
  const cleaned = String(gradeLevel).trim().toLowerCase();
  const match = Object.entries(GRADE_SECTION_MAP).find(
    ([grade]) => grade.toLowerCase() === cleaned
  );
  if (match) return match[1];
  if (cleaned === 'kinder' || cleaned === 'k') return 'Joy';
  return fallback;
}

export const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function parseSafePHDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  // If formatted already like "November 27, 2026 • 09:05 AM PHT", keep caller check
  const hasOffset = /[zZ]$|[+-]\d{2}:\d{2}$/.test(str);
  const normalized = str.includes('T') && !hasOffset ? `${str}+08:00` : str;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatPHDateTime(value) {
  if (!value) return 'N/A';
  const str = String(value);
  if (str.includes('PHT')) return str;
  const parsed = parseSafePHDate(value);
  if (!parsed) return str;
  return (
    parsed.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' PHT'
  );
}

export function formatPHDate(value) {
  if (!value) return 'N/A';
  const parsed = parseSafePHDate(value);
  if (!parsed) return String(value);
  return parsed.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const CCA_OFFICE_INFO = {
  schoolName: 'CALVARY CHRISTIAN ACADEMY',
  officeName: 'OFFICE OF THE CASHIER',
  address: 'BLK 1 LOT 9-10, Sarmiento Townville, Poblacion I, CSJDM, Bulacan 3023',
  contact: 'Mobile: 0956 150 4946  Tel: (044) 305 6166',
  crestLogoUrl: '/assets/[CCA L2.2] CCA Logo Icon Blue Transparent.png',
};

// Official SY 2026-2027 CCA Payment Guidelines & Fee Schedules
export function getGradeFeeBenchmarks(gradeLevel, isCbcMember = false) {
  const g = String(gradeLevel || '').trim().toLowerCase();

  const regFee = {
    category_name: 'Registration Fee',
    sub_description: 'Registration & Miscellaneous (Due upon enrollment)',
    total_due: 5700,
  };

  let tuitionDue = 18010;
  let monthlyTuition = 1801;
  let energyDue = 3000;
  let monthlyEnergy = 300;
  let booksDue = 6900;

  if (g.includes('pre-kinder') || g.includes('kinder')) {
    tuitionDue = isCbcMember ? 16060 : 17060;
    monthlyTuition = isCbcMember ? 1606 : 1706;
    energyDue = 1500;
    monthlyEnergy = 150;
    booksDue = 5500;
  } else if (['7', '8', '9', '10'].some((yr) => g.includes(yr))) {
    tuitionDue = isCbcMember ? 19060 : 20060;
    monthlyTuition = isCbcMember ? 1906 : 2006;
    energyDue = 3000;
    monthlyEnergy = 300;
    booksDue = 9200;
  } else {
    // Grade 1-6
    tuitionDue = isCbcMember ? 17010 : 18010;
    monthlyTuition = isCbcMember ? 1701 : 1801;
    energyDue = 3000;
    monthlyEnergy = 300;
    if (g.includes('grade 1') || g === 'g1') booksDue = 6900;
    else if (g.includes('grade 2') || g === 'g2') booksDue = 6300;
    else if (g.includes('grade 3') || g === 'g3') booksDue = 6900;
    else booksDue = 8500; // Grade 4-6
  }

  const tuitFee = {
    category_name: 'Tuition Fee',
    sub_description: `Annual Tuition (10 Months @ ₱${monthlyTuition.toLocaleString()}/mo)`,
    total_due: tuitionDue,
    monthly: monthlyTuition,
  };

  const energyFee = {
    category_name: 'Energy Fee',
    sub_description: `Air-Conditioning & Utility Subsidy (10 Months @ ₱${monthlyEnergy.toLocaleString()}/mo)`,
    total_due: energyDue,
    monthly: monthlyEnergy,
  };

  const booksFee = {
    category_name: 'Books',
    sub_description: `Textbooks & Instructional Modules (SY 2026-2027: ₱${booksDue.toLocaleString()})`,
    total_due: booksDue,
  };

  const otherFee = {
    category_name: 'Other Fees',
    sub_description: 'Educational Tour, Swimming & Activities',
    total_due: 1500,
  };

  return [tuitFee, regFee, booksFee, energyFee, otherFee];
}

export function getDefaultStudentPassword(lastNameOrFullName = '') {
  const raw = String(lastNameOrFullName || '').trim();
  const lastPart = raw.includes(',')
    ? raw.split(',')[0].trim()
    : (raw.split(/\s+/).filter(Boolean).pop() || '');
  const letters = lastPart.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = (letters.length >= 3 ? letters.slice(0, 3) : `${letters}CCA`.slice(0, 3)).toUpperCase();
  return `${prefix}#0000`;
}

export function formatStudentFullName(lastName = '', firstName = '', middleName = '') {
  const ln = String(lastName || '').trim();
  const fn = String(firstName || '').trim();
  const mn = String(middleName || '').trim();
  if (!ln && !fn) return '';
  if (!ln) return [fn, mn].filter(Boolean).join(' ');
  const given = [fn, mn].filter(Boolean).join(' ');
  return given ? `${ln}, ${given}` : ln;
}

export function splitStudentFullName(fullName = '') {
  const raw = String(fullName || '').trim();
  if (!raw) return { last_name: '', first_name: '', middle_name: '' };
  if (raw.includes(',')) {
    const [lnPart, restPart = ''] = raw.split(',', 2);
    const words = restPart.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      return { last_name: lnPart.trim(), first_name: words[0] || '', middle_name: '' };
    }
    return {
      last_name: lnPart.trim(),
      first_name: words.slice(0, -1).join(' '),
      middle_name: words[words.length - 1],
    };
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 1) return { last_name: words[0], first_name: '', middle_name: '' };
  if (words.length === 2) return { last_name: words[1], first_name: words[0], middle_name: '' };
  return {
    last_name: words[words.length - 1],
    first_name: words.slice(0, -2).join(' '),
    middle_name: words[words.length - 2],
  };
}
