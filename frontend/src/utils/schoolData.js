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
