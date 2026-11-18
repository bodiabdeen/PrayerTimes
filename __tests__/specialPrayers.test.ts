import {
  addMinutesToKey,
  buildSpecialPrayerRows,
  formatSpecialPrayerDay,
  isSpecialPrayerVisible,
  parseSpecialPrayers,
  toMinuteKey,
} from '../src/utils/specialPrayers';

// Local time 18 Nov 2026, 12:00 (a Wednesday)
const NOW = new Date(2026, 10, 18, 12, 0);

describe('parseSpecialPrayers', () => {
  it('returns an empty list for a missing or malformed document', () => {
    expect(parseSpecialPrayers(undefined)).toEqual([]);
    expect(parseSpecialPrayers(null)).toEqual([]);
    expect(parseSpecialPrayers({})).toEqual([]);
    expect(parseSpecialPrayers({list: 'nope'})).toEqual([]);
  });

  it('skips items without a name, a valid date or a valid time', () => {
    const items = parseSpecialPrayers({
      list: [
        {id: 'a', name: '', date: '2026-11-18', time: '13:30'},
        {id: 'b', name: 'Janazah', date: '18/11/2026', time: '13:30'},
        {id: 'c', name: 'Janazah', date: '2026-11-18', time: '25:00'},
        {id: 'd', name: 'Janazah', date: '2026-11-18', time: '1:30'},
        null,
        'text',
        {id: 'e', name: '  Janazah  ', date: '2026-11-18', time: '13:30'},
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({id: 'e', name: 'Janazah'});
  });

  it('hides one hour after the prayer time when hideAfter is missing', () => {
    const [item] = parseSpecialPrayers({list: [{id: 1, name: 'Janazah', date: '2026-11-18', time: '13:30'}]});
    expect(item.id).toBe('1');
    expect(item.showFrom).toBe('');
    expect(item.hideAfter).toBe('2026-11-18T14:30');
  });

  it('rolls the default hide time over midnight', () => {
    const [item] = parseSpecialPrayers({list: [{id: 'x', name: 'Qiyam', date: '2026-12-31', time: '23:30'}]});
    expect(item.hideAfter).toBe('2027-01-01T00:30');
  });

  it('keeps valid showFrom and hideAfter and sorts by date and time', () => {
    const items = parseSpecialPrayers({
      list: [
        {id: 'later', name: 'Eid', date: '2026-11-25', time: '08:30'},
        {id: 'sooner', name: 'Tahajjud', date: '2026-11-19', time: '02:00', showFrom: '2026-11-18T09:00', hideAfter: '2026-11-19T03:00'},
      ],
    });
    expect(items.map(i => i.id)).toEqual(['sooner', 'later']);
    expect(items[0].showFrom).toBe('2026-11-18T09:00');
    expect(items[0].hideAfter).toBe('2026-11-19T03:00');
  });

  it('limits very long names to 60 characters', () => {
    const [item] = parseSpecialPrayers({list: [{name: 'x'.repeat(100), date: '2026-11-18', time: '13:30'}]});
    expect(item.name).toHaveLength(60);
  });
});

describe('isSpecialPrayerVisible', () => {
  it('shows between showFrom (inclusive) and hideAfter (exclusive)', () => {
    const item = {showFrom: '2026-11-18T12:00', hideAfter: '2026-11-18T13:00'};
    expect(isSpecialPrayerVisible(item, new Date(2026, 10, 18, 11, 59))).toBe(false);
    expect(isSpecialPrayerVisible(item, new Date(2026, 10, 18, 12, 0))).toBe(true);
    expect(isSpecialPrayerVisible(item, new Date(2026, 10, 18, 12, 59))).toBe(true);
    expect(isSpecialPrayerVisible(item, new Date(2026, 10, 18, 13, 0))).toBe(false);
  });

  it('treats an empty showFrom as "straight away"', () => {
    expect(isSpecialPrayerVisible({showFrom: '', hideAfter: '2026-11-18T13:00'}, NOW)).toBe(true);
  });

  it('never shows an item without hideAfter', () => {
    expect(isSpecialPrayerVisible({showFrom: ''}, NOW)).toBe(false);
  });
});

describe('buildSpecialPrayerRows', () => {
  it('drops expired items, keeps future ones, and marks rows as custom special prayers', () => {
    const items = parseSpecialPrayers({
      list: [
        {id: 'old', name: 'Old', date: '2026-11-18', time: '09:00'}, // hid at 10:00
        {id: 'soon', name: 'Janazah', date: '2026-11-18', time: '13:30'},
        {id: 'future', name: 'Eid', date: '2026-11-25', time: '08:30', showFrom: '2026-11-22T00:00'},
      ],
    });
    const rows = buildSpecialPrayerRows(items, NOW);
    expect(rows.map(r => r.customId)).toEqual(['soon', 'future']);
    expect(rows[0]).toMatchObject({
      name: 'Janazah',
      apt: '--:--',
      mat: '--:--',
      mit: '13:30',
      isSpecial: true,
      isCustom: true,
      date: '2026-11-18',
    });
  });

  it('never gives a row an APT, so it can never become the "next prayer"', () => {
    const rows = buildSpecialPrayerRows(
      parseSpecialPrayers({list: [{id: 'a', name: 'Fajr الفجر', date: '2026-11-18', time: '13:30'}]}),
      NOW,
    );
    expect(rows[0].apt).toBe('--:--');
  });
});

describe('dates and labels', () => {
  it('formats keys in local time', () => {
    expect(toMinuteKey(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03');
    expect(addMinutesToKey('2026-11-18', '23:59', 2)).toBe('2026-11-19T00:01');
  });

  it('labels today, tomorrow and other days', () => {
    expect(formatSpecialPrayerDay('2026-11-18', NOW)).toEqual({en: 'Today', ar: 'اليوم'});
    expect(formatSpecialPrayerDay('2026-11-19', NOW)).toEqual({en: 'Tomorrow', ar: 'غدًا'});
    expect(formatSpecialPrayerDay('2026-11-20', NOW)).toEqual({en: 'Fri 20 Nov', ar: ''});
  });
});
