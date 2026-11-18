import {buildDayPrayers, FallbackRules} from '../src/utils/dayPrayers';
import {DailyConfig} from '../src/types';

const NOW = new Date(2026, 10, 18, 12, 0);

const rules: FallbackRules = {
  fajr: {matOffset: 0, mitOffset: 5},
  dhuhr: {matOffset: 0, mitOffset: 5},
  asr: {matOffset: 10, mitOffset: 15},
  maghrib: {matOffset: 0, mitOffset: 5},
  isha: {matOffset: 0, mitOffset: 5},
};

const rawTimes = {fajr: '05:42', sunrise: '07:52', dhuhr: '12:03', asr: '13:53', maghrib: '16:14', isha: '17:44'};
const offsets = {fajr: 0, dhuhr: 2, asr: -3, maghrib: 2, isha: 0};

const daily = (overrides: Partial<DailyConfig['specialPrayers']> = {}): DailyConfig => ({
  mat: {fajr: '05:42', dhuhr: '12:05', asr: '00:00', maghrib: '', isha: '19:15'},
  mit: {fajr: '06:30', dhuhr: '13:25', asr: '00:00', maghrib: '', isha: '19:30'},
  specialPrayers: {...overrides},
});

const build = (dailyConfig: DailyConfig, scheduled = {}, specialPrayers = []) =>
  buildDayPrayers({rawTimes, offsets, dailyConfig, scheduled, fallbackRules: rules, specialPrayers, now: NOW});

describe('buildDayPrayers', () => {
  it('builds the five prayers and sunrise with offsets applied to the start times', () => {
    const p = build(daily());
    expect(p.map(x => x.name)).toEqual(['Fajr الفجر', 'Sunrise الشروق', 'Dhuhr الظهر', 'Asr العصر', 'Maghrib المغرب', 'Isha العشاء']);
    expect(p.map(x => x.apt)).toEqual(['05:42', '07:52', '12:05', '13:50', '16:16', '17:44']);
    expect(p[1]).toMatchObject({mat: '--:--', mit: '--:--'});
  });

  it('uses scheduled times first, then daily times, then the fallback offsets', () => {
    const p = build(daily(), {dhuhr: {mat: '12:40', mit: ''}});
    const byName = Object.fromEntries(p.map(x => [x.name.split(' ')[0], x]));
    expect(byName.Dhuhr).toMatchObject({mat: '12:40', mit: '13:25'}); // scheduled MAT, daily MIT
    expect(byName.Fajr).toMatchObject({mat: '05:42', mit: '06:30'}); // daily
    expect(byName.Asr).toMatchObject({mat: '14:00', mit: '14:15'}); // "00:00" counts as empty: 13:50 + 10, then + 15
    expect(byName.Maghrib).toMatchObject({mat: '16:16', mit: '16:21'}); // empty: start + 0, then + 5
  });

  it("inserts both Jumu'ahs after Dhuhr and Taraweeh after Isha, and adds Eid rows at the end", () => {
    const p = build(daily({
      jumaa: {adhan: '13:00', iqama: '13:20'},
      jumaa2: {adhan: '13:35', iqama: '14:45'},
      taraweeh: {time: '21:00'},
      eidFitr: {prayer1: {time: '08:00'}, prayer2: {time: ''}},
    }));
    expect(p.map(x => x.name)).toEqual([
      'Fajr الفجر', 'Sunrise الشروق', 'Dhuhr الظهر', "Jumu'ah الجمعة", "Jumu'ah 2 الجمعة ٢",
      'Asr العصر', 'Maghrib المغرب', 'Isha العشاء', 'Taraweeh التراويح', 'Eid al-Fitr عيد الفطر - Prayer 1',
    ]);
    expect(p[3]).toMatchObject({apt: '--:--', mat: '13:00', mit: '13:20'});
    expect(p[8]).toMatchObject({isSpecial: true, mit: '21:00'});
  });

  it('adds the admin special prayers last', () => {
    const p = build(daily(), {}, [
      {id: 'a', name: 'Janazah', date: '2026-11-18', time: '13:30', showFrom: '', hideAfter: '2026-11-18T14:30'},
    ] as any);
    expect(p[p.length - 1]).toMatchObject({name: 'Janazah', isCustom: true, mit: '13:30'});
  });
});
