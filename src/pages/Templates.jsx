import { Link } from 'react-router-dom'
import { useCollection } from '../context/AppContext.jsx'
import { Card, EmptyState } from '../components/ui.jsx'

export default function Templates() {
  const { items: templates, del } = useCollection('templates', 'limit=100')

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Prescription Templates</h1>
      <Card>
        {templates.length === 0 ? (
          <EmptyState
            title='No templates saved. Fill a prescription and click "Save as Template" to create one.'
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-100 px-4 py-3">
                <div className="font-medium text-ink text-sm">{t.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {(t.medicines || []).length} medicine(s)
                  {t.diagnosis ? ` · ${t.diagnosis}` : ''}
                </div>
                <div className="flex gap-3 mt-2">
                  <Link
                    to={`/prescriptions?template=${t.id}`}
                    className="text-xs text-teal font-medium"
                  >
                    Use Template
                  </Link>
                  <button
                    onClick={() => del(t.id)}
                    className="text-xs text-rose font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
