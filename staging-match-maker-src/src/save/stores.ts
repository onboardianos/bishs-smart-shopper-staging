// Preferred-store list from the Save Progress handoff: staging stores, Corp removed. Q8 still needs a ruling.
export const SAVE_STORES: { code: string; label: string }[] = [
  { code: 'AUT', label: 'American Fork, UT' },
  { code: 'AIN', label: 'Anderson, IN' },
  { code: 'ONE', label: 'Bellevue/Omaha, NE' },
  { code: 'BMT', label: 'Billings, MT' },
  { code: 'ZMT', label: 'Bozeman, MT' },
  { code: 'CAL', label: 'Calera, AL' },
  { code: 'CIA', label: 'Cedar Rapids, IA' },
  { code: 'CWY', label: 'Cheyenne, WY' },
  { code: 'CMI', label: 'Coldwater, MI' },
  { code: 'DIA', label: 'Davenport, IA' },
  { code: 'FCA', label: 'Fairfield, CA' },
  { code: 'GMT', label: 'Great Falls, MT' },
  { code: 'IDF', label: 'Idaho Falls, ID' },
  { code: 'JOR', label: 'Junction City, OR' },
  { code: 'KMT', label: 'Kalispell, MT' },
  { code: 'KNE', label: 'Kearney, NE' },
  { code: 'LNE', label: 'Lincoln, NE' },
  { code: 'LTX', label: 'Longview, TX' },
  { code: 'LMI', label: 'Ludington, MI' },
  { code: 'MID', label: 'Meridian, ID' },
  { code: 'MKY', label: 'Murray, KY' },
  { code: 'OKY', label: 'Oak Grove, KY' },
  { code: 'RSD', label: 'Rapid City, SD' },
  { code: 'SUT', label: 'Salt Lake, UT' },
  { code: 'SSD', label: 'Sioux Falls, SD' },
  { code: 'TMI', label: 'Traverse City, MI' },
  { code: 'TWF', label: 'Twin Falls, ID' },
];

export function saveStoreLabel(code: string) {
  return SAVE_STORES.find((s) => s.code === code)?.label.split(',')[0] || '';
}
