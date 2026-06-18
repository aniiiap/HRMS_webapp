import dayjs from 'dayjs'

/** Today's date for `<input type="date">` (local timezone). */
export function todayDateValue() {
  return dayjs().format('YYYY-MM-DD')
}

/** Date string for `<input type="date">` from API value. */
export function toDateInputValue(value) {
  if (!value) return todayDateValue()
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : todayDateValue()
}

/** API date string (YYYY-MM-DD) for form value. */
export function fromDateInputValue(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return todayDateValue()
  const parsed = dayjs(trimmed, 'YYYY-MM-DD', true)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : todayDateValue()
}

export const PUBLISH_DATE_HINT =
  'Employees see this announcement on the selected date. Choose today to publish immediately.'
