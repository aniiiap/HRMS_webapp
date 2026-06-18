/** Optional component toggles for live CTC calculator (matches backend INCLUDE_TOGGLE_FIELDS). */

export const CTC_EARNING_INCLUDE_OPTIONS = [
  { key: 'include_variable_pay', label: 'Variable pay' },
  { key: 'include_cea', label: 'Children education (CEA)' },
  { key: 'include_lta', label: 'Leave travel (LTA)' },
  { key: 'include_mobile', label: 'Mobile / internet' },
  { key: 'include_uniform', label: 'Uniform' },
  { key: 'include_transport', label: 'Transport' },
  { key: 'include_meal', label: 'Meal / food' },
  { key: 'include_medical', label: 'Medical' },
]

export const CTC_EMPLOYER_INCLUDE_OPTIONS = [
  { key: 'include_employer_pf', label: 'Employer PF (EPF)' },
  { key: 'include_gratuity_provision', label: 'Gratuity provision' },
  { key: 'include_group_health', label: 'Health insurance' },
  { key: 'include_employer_esi', label: 'Employer ESIC' },
]

export const CTC_INCLUDE_OPTIONS = [...CTC_EARNING_INCLUDE_OPTIONS, ...CTC_EMPLOYER_INCLUDE_OPTIONS]

export function defaultIncludeFlagsFromTemplate(tpl) {
  return Object.fromEntries(CTC_INCLUDE_OPTIONS.map((o) => [o.key, tpl ? tpl[o.key] !== false : true]))
}
