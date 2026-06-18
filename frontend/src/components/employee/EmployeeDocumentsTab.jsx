import { FileText } from 'lucide-react'
import ProfileSectionCard from './ProfileSectionCard'

export default function EmployeeDocumentsTab({ documents = [] }) {
  return (
    <ProfileSectionCard title="Documents">
      {documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No documents uploaded. HR can upload files from the admin panel.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{d.title}</p>
                  {d.document_type && <p className="text-xs capitalize text-slate-500">{d.document_type}</p>}
                </div>
              </div>
              <a
                href={d.file}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-semibold text-brand-600 hover:underline"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </ProfileSectionCard>
  )
}
