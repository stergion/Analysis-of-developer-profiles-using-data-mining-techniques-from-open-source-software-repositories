interface Years {
  years: number;
}
interface Months {
  months: number;
}
interface Days {
  days: number;
}
type WindowInterval = Years | Months | Days;

interface YMD extends Partial<Years>, Partial<Months>, Partial<Days> { }

interface HMSm {
  hours?: number;
  minutes?: number;
  seconds?: number;
  millis?: number;
}
interface DateTime extends YMD, HMSm { }

type DateWindowsMapKeys = "yearly" | "monthly" | "daily" | "weekly";

export class DateWindows {
  private _fromDate!: Date;
  private _toDate!: Date;
  private _dateWindowsMap: Map<
    DateWindowsMapKeys,
    Array<[Date, Date]>
  >;

  constructor(toDate: Date, ymd: YMD);
  constructor(toDate: Date, fromDate: Date);
  constructor(toDate: Date, ymdOrFromDate: Date | YMD) {
    this._dateWindowsMap = new Map();
    this.toDate = toDate;

    if (ymdOrFromDate instanceof Date) {
      this.fromDate = ymdOrFromDate;
    } else {
      const ymd = ymdOrFromDate;
      const fromDate = this.incrementUTCDate(this.toDate, { days: 1 });
      this.fromDate = this.decrimentUTCDate(fromDate, ymd);
    }
  }


  public set toDate(date: Date) {
    this._dateWindowsMap.clear();

    this._toDate = this.setEndOfDay(new Date(date));
  }

  public set fromDate(date: Date) {
    this._dateWindowsMap.clear();

    this._fromDate = this.setStartOfDay(new Date(date));
  }

  public get toDate(): Date {
    return new Date(this._toDate);
  }

  public get fromDate(): Date {
    return new Date(this._fromDate);
  }


  incrementFromDate(ymd: YMD) {
    this.fromDate = this.setStartOfDay(this.incrementUTCDate(this.fromDate, ymd));
  }

  incrementToDate(ymd: YMD) {
    this.toDate = this.setEndOfDay(this.incrementUTCDate(this.toDate, ymd));
  }

  private incrementUTCDate(date: Date, dateTime: DateTime): Date {
    date.setUTCMilliseconds(date.getUTCMilliseconds() + (dateTime.millis ?? 0));
    date.setUTCSeconds(date.getUTCSeconds() + (dateTime.seconds ?? 0));
    date.setUTCMinutes(date.getUTCMinutes() + (dateTime.minutes ?? 0));
    date.setUTCHours(date.getUTCHours() + (dateTime.hours ?? 0));

    date.setUTCDate(date.getUTCDate() + (dateTime.days ?? 0));
    date.setUTCMonth(date.getUTCMonth() + (dateTime.months ?? 0));
    date.setUTCFullYear(date.getUTCFullYear() + (dateTime.years ?? 0));


    return date;
  }

  private decrimentUTCDate(date: Date, dateTime: DateTime): Date {
    date.setUTCMilliseconds(date.getUTCMilliseconds() - (dateTime.millis ?? 0));
    date.setUTCSeconds(date.getUTCSeconds() - (dateTime.seconds ?? 0));
    date.setUTCMinutes(date.getUTCMinutes() - (dateTime.minutes ?? 0));
    date.setUTCHours(date.getUTCHours() - (dateTime.hours ?? 0));

    date.setUTCDate(date.getUTCDate() - (dateTime.days ?? 0));
    date.setUTCMonth(date.getUTCMonth() - (dateTime.months ?? 0));
    date.setUTCFullYear(date.getUTCFullYear() - (dateTime.years ?? 0));

    return date;
  }

  setEndOfDay(date: Date) {
    date.setUTCHours(23);
    date.setUTCMinutes(59);
    date.setUTCSeconds(59);
    date.setUTCMilliseconds(999);

    return date;
  }
  setStartOfDay(date: Date) {
    date.setUTCHours(0);
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    date.setUTCMilliseconds(0);

    return date;
  }

  private getWindows(interval: WindowInterval): Array<[Date, Date]> {
    let start = this.setStartOfDay(this.incrementUTCDate(this.toDate, { days: 1 }));
    let end = this.toDate;
    const windows = [];

    while (start > this.fromDate) {
      start = this.setStartOfDay(this.decrimentUTCDate(new Date(start), interval));
      windows.push([start, end] as [Date, Date]);
      end = this.setEndOfDay(this.decrimentUTCDate(new Date(end), interval));
    }

    if (windows.at(-1)?.[0]) windows.at(-1)![0] = this.fromDate;

    return windows;
  }

  yearly(): Array<[Date, Date]> {
    const key: DateWindowsMapKeys = "yearly";

    if (!this._dateWindowsMap.has(key))
      this._dateWindowsMap.set(key, this.getWindows({ years: 1 }));

    return this._dateWindowsMap.get(key)!;
  }

  monthly(): Array<[Date, Date]> {
    const key: DateWindowsMapKeys = "monthly";

    if (!this._dateWindowsMap.has(key))
      this._dateWindowsMap.set(key, this.getWindows({ months: 1 }));

    return this._dateWindowsMap.get(key)!;
  }

  daily(): Array<[Date, Date]> {
    const key: DateWindowsMapKeys = "daily";

    if (!this._dateWindowsMap.has(key))
      this._dateWindowsMap.set(key, this.getWindows({ days: 1 }));

    return this._dateWindowsMap.get(key)!;
  }

  weekly(): Array<[Date, Date]> {
    const key: DateWindowsMapKeys = "daily";

    if (!this._dateWindowsMap.has(key))
      this._dateWindowsMap.set(key, this.getWindows({ days: 7 }));

    return this._dateWindowsMap.get(key)!;
  }
}

function getDate(date: Date | undefined) {
  const dateNow = date ?? new Date();
  if (!(dateNow instanceof Date)) throw Error("Variable 'date' is not instance of Date");

  dateNow.setUTCHours(23);
  dateNow.setUTCMinutes(59);
  dateNow.setUTCSeconds(59);
  dateNow.setUTCMilliseconds(999);
  return dateNow;
}

const yearly = (years: number, date?: Date) => {
  if (!years) throw Error("Please provide variable 'years'.");

  const dateNow = getDate(date);

  const windows = new Array(years);
  for (let i = 0; i < years; i++) {
    const end = new Date(dateNow);
    end.setUTCFullYear(dateNow.getUTCFullYear() - i);
    const start = new Date(dateNow);
    start.setUTCFullYear(dateNow.getUTCFullYear() - (i + 1));
    start.setUTCMilliseconds(dateNow.getUTCMilliseconds() + 1);

    windows[i] = [start, end];
  }
  return windows;
};

const monthly = (months: number, date?: Date) => {
  if (!months) throw Error("Please provide variable 'months'.");

  const dateNow = getDate(date);

  const windows = new Array(months);
  for (let i = 0; i < months; i++) {
    const end = new Date(dateNow);
    end.setUTCMonth(dateNow.getUTCMonth() - i);
    const start = new Date(dateNow);
    start.setUTCMonth(dateNow.getUTCMonth() - (i + 1));
    start.setUTCMilliseconds(dateNow.getUTCMilliseconds() + 1);

    windows[i] = [start, end];
  }

  return windows;
};

const weekly = (weeks: number, date?: Date) => {
  if (!weeks) throw Error("Please provide variable 'weeks'.");

  const dateNow = getDate(date);

  const windows = new Array(weeks);
  for (let i = 0; i < weeks; i++) {
    const end = new Date(dateNow);
    end.setUTCDate(dateNow.getUTCDate() - i * 7);
    const start = new Date(dateNow);
    start.setUTCDate(dateNow.getUTCDate() - ((i + 1) * 7 + 1));
    start.setUTCMilliseconds(dateNow.getUTCMilliseconds() + 1);

    windows[i] = [start, end];
  }

  return windows;
};

const daily = (days: number, date?: Date) => {
  if (!days) throw Error("Please provide variable 'days'.");
  const dateNow = getDate(date);

  const windows = new Array(days);
  for (let i = 0; i < days; i++) {
    const end = new Date(dateNow);
    end.setUTCDate(dateNow.getUTCDate() - i);
    const start = new Date(dateNow);
    start.setUTCDate(dateNow.getUTCDate() - (i + 1));
    start.setUTCMilliseconds(dateNow.getUTCMilliseconds() + 1);

    windows[i] = [start, end];
  }

  return windows;
};

export default { yearly, monthly, weekly, daily };
