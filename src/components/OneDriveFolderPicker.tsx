import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, FolderOpen, Loader2 } from 'lucide-react'
import type { GraphDriveItemDto } from '../../shared/microsoftGraph'
import { fetchOneDriveFolders } from '../lib/microsoft'

interface SelectedOneDriveFolder {
  id: string
  label: string
  url?: string
}

interface OneDriveFolderPickerProps {
  accountId: string
  selectedFolderId?: string
  onSelect: (folder: SelectedOneDriveFolder) => void
}

type Breadcrumb = { id?: string; name: string }

export function OneDriveFolderPicker({
  accountId,
  selectedFolderId,
  onSelect,
}: OneDriveFolderPickerProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ name: 'OneDrive' }])
  const [folders, setFolders] = useState<GraphDriveItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentParentId = breadcrumbs[breadcrumbs.length - 1]?.id

  const loadFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchOneDriveFolders(accountId, currentParentId)
      setFolders(items)
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load folders')
      setFolders([])
    } finally {
      setLoading(false)
    }
  }, [accountId, currentParentId])

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  const folderLabel = (folder: GraphDriveItemDto) => {
    const path = [...breadcrumbs.slice(1).map((entry) => entry.name), folder.name].join(' / ')
    return path ? `OneDrive / ${path}` : `OneDrive / ${folder.name}`
  }

  const openFolder = (folder: GraphDriveItemDto) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const goToCrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 text-caption text-wf-text-secondary">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.name}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && <span className="text-wf-text-tertiary">/</span>}
            <button
              type="button"
              onClick={() => goToCrumb(index)}
              className="font-medium text-wf-accent"
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-caption text-wf-text-tertiary">
          <Loader2 size={16} className="animate-spin" />
          Loading folders…
        </div>
      ) : error ? (
        <p className="rounded-xl bg-wf-red/10 px-3 py-2 text-caption text-wf-red">{error}</p>
      ) : folders.length === 0 ? (
        <p className="py-2 text-caption text-wf-text-tertiary">No subfolders here.</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-wf-border bg-wf-bg p-2">
          {folders.map((folder) => {
            const selected = selectedFolderId === folder.id
            return (
              <div
                key={folder.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
                  selected ? 'bg-wf-accent-soft' : 'hover:bg-black/[0.03]'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      id: folder.id,
                      label: folderLabel(folder),
                      url: folder.webUrl,
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <FolderOpen
                    size={16}
                    className={selected ? 'text-wf-accent' : 'text-wf-text-tertiary'}
                    strokeWidth={1.75}
                  />
                  <span className="truncate text-body">{folder.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFolder(folder)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-wf-text-tertiary hover:bg-black/[0.05]"
                  aria-label={`Open ${folder.name}`}
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {breadcrumbs.length > 1 && (
        <button
          type="button"
          onClick={() => goToCrumb(breadcrumbs.length - 2)}
          className="inline-flex items-center gap-1 text-caption font-semibold text-wf-accent"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          Back
        </button>
      )}
    </div>
  )
}

export type { SelectedOneDriveFolder }
