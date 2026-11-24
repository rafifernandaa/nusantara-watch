import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera,
  Clock,
  ExternalLink,
  FolderOpen,
  Link2,
  MapPin,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { useWatchStore } from '../store/useWatchStore';
import { APPLE_SPRINGS } from '../utils/apple-physics';
import { formatCoordinates } from '../utils/formatters';
import {
  createCustomFieldDocFromDriveUrl,
  getFieldDocsForProvince,
  parseGoogleDriveLink,
} from '../utils/gdriveEvidence';
import { sanitizePlainText } from '../utils/security';

export function FieldEvidenceModal() {
  const activeDoc = useWatchStore((s) => s.activeEvidenceModalDoc);
  const customFieldDocs = useWatchStore((s) => s.customFieldDocs);
  const setActiveEvidenceModalDoc = useWatchStore((s) => s.setActiveEvidenceModalDoc);
  const addCustomFieldDoc = useWatchStore((s) => s.addCustomFieldDoc);
  const flyToCoordinates = useWatchStore((s) => s.flyToCoordinates);

  const [showAttachForm, setShowAttachForm] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDoc) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setActiveEvidenceModalDoc(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeDoc, setActiveEvidenceModalDoc]);

  const galleryDocs = useMemo(() => {
    if (!activeDoc) return [];
    const provinceDocs = getFieldDocsForProvince(activeDoc.province, customFieldDocs);
    const hasActive = provinceDocs.some((d) => d.id === activeDoc.id);
    return hasActive ? provinceDocs : [activeDoc, ...provinceDocs];
  }, [activeDoc, customFieldDocs]);

  const parsedDrive = useMemo(
    () => (activeDoc ? parseGoogleDriveLink(activeDoc.driveUrl) : null),
    [activeDoc]
  );

  const handleAttachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc) return;
    const created = createCustomFieldDocFromDriveUrl({
      driveUrl: driveUrlInput,
      title: titleInput,
      team: teamInput,
      caption: captionInput,
      province: activeDoc.province,
      coordinates: activeDoc.coordinates,
      hotspotId: activeDoc.hotspotId,
    });
    if (!created) {
      setFormError(
        'Gunakan URL HTTPS Google Drive yang valid (drive.google.com/file/d/... atau /drive/folders/...).'
      );
      return;
    }
    setFormError(null);
    addCustomFieldDoc(created);
    setActiveEvidenceModalDoc(created);
    setDriveUrlInput('');
    setTitleInput('');
    setTeamInput('');
    setCaptionInput('');
    setShowAttachForm(false);
  };

  return (
    <AnimatePresence>
      {activeDoc && (
        <motion.div
          key="field-evidence-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Dokumentasi Lapangan BNPB: ${activeDoc.title}`}
          onPointerDown={() => setActiveEvidenceModalDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={APPLE_SPRINGS.sheet}
            onPointerDown={(e) => e.stopPropagation()}
            className="apple-glass-heavy w-full max-w-3xl max-h-[90vh] rounded-2xl border border-[var(--border-strong)] flex flex-col overflow-hidden"
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                    {activeDoc.mediaType === 'folder' ? (
                      <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                    ) : (
                      <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    <span>
                      {parsedDrive?.kind === 'folder'
                        ? 'Folder Google Drive Posko'
                        : 'Bukti Lapangan Google Drive'}
                    </span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[var(--text-muted)] truncate">
                    {activeDoc.id}
                  </span>
                </div>
                <h2 className="type-title text-[var(--text-primary)] mt-1 truncate">
                  {sanitizePlainText(activeDoc.title)}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onPointerDown={() => setShowAttachForm(!showAttachForm)}
                  className="apple-pressable inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 h-8 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Lampirkan Link Drive</span>
                </button>
                <button
                  type="button"
                  onPointerDown={() => setActiveEvidenceModalDoc(null)}
                  className="apple-pressable rounded-lg bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                  aria-label="Tutup lightbox dokumentasi lapangan"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Lightbox Scrollable Content */}
            <div className="scroll-mask-y flex-1 overflow-y-auto p-5 space-y-4">
              {/* Optional Custom Google Drive Link Attachment Form */}
              {showAttachForm && (
                <form
                  onSubmit={handleAttachSubmit}
                  className="apple-elevated-card rounded-xl p-3.5 space-y-2.5 border border-[var(--border-strong)]"
                >
                  <div className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>Tambah Tautan Dokumentasi Google Drive ({activeDoc.province})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      required
                      value={driveUrlInput}
                      onChange={(e) => setDriveUrlInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... atau /drive/folders/..."
                      className="sm:col-span-2 rounded-lg bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)]"
                    />
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="Judul dokumentasi (mis. Pemadaman Darat Blok C)"
                      className="rounded-lg bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={teamInput}
                      onChange={(e) => setTeamInput(e.target.value)}
                      placeholder="Tim / Petugas (mis. Manggala Agni Daops I)"
                      className="rounded-lg bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      placeholder="Catatan kondisi lapangan..."
                      className="sm:col-span-2 rounded-lg bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                  {formError && (
                    <p className="text-[11px] text-[var(--negative)]">{formError}</p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onPointerDown={() => setShowAttachForm(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="apple-pressable rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Simpan Bukti Drive
                    </button>
                  </div>
                </form>
              )}

              {/* Large Reconnaissance Photo / Frame Viewer */}
              <div className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-deepest)]">
                <img
                  src={activeDoc.thumbnailDataUri}
                  alt={activeDoc.title}
                  className="w-full max-h-[340px] object-cover block"
                />
                {parsedDrive?.isValidDriveUrl && (
                  <div className="px-3.5 py-2.5 border-t border-[var(--border-hairline)] bg-[var(--surface-card)] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono-tabular text-[11px] text-[var(--text-muted)] truncate max-w-md">
                      {parsedDrive.cleanUrl}
                    </span>
                    <a
                      href={parsedDrive.cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-pressable inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/35 px-3 py-1.5 text-xs font-medium text-[var(--accent)] shrink-0"
                    >
                      <span>Buka di Google Drive</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Field Telemetry Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="apple-elevated-card rounded-xl p-3 space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[var(--positive)]" />
                    Petugas lapangan
                  </span>
                  <p className="font-medium text-[var(--text-primary)] leading-snug">
                    {sanitizePlainText(activeDoc.team)}
                  </p>
                </div>

                <div className="apple-elevated-card rounded-xl p-3 space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--info)]" />
                    Waktu pengambilan
                  </span>
                  <p className="font-mono-tabular font-medium text-[var(--text-primary)]">
                    {sanitizePlainText(activeDoc.capturedAt)}
                  </p>
                </div>

                <div className="apple-elevated-card rounded-xl p-3 space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Lokasi GPS ({activeDoc.province})
                  </span>
                  <button
                    type="button"
                    onPointerDown={() => {
                      flyToCoordinates(
                        activeDoc.coordinates[0],
                        activeDoc.coordinates[1],
                        8.8,
                        42
                      );
                      setActiveEvidenceModalDoc(null);
                    }}
                    className="font-mono-tabular font-medium text-[var(--accent)] hover:underline text-left"
                  >
                    {formatCoordinates(
                      activeDoc.coordinates[0],
                      activeDoc.coordinates[1]
                    )}
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div className="apple-elevated-card rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                  Laporan &amp; catatan lapangan
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {sanitizePlainText(activeDoc.caption)}
                </p>
              </div>

              {/* Province Gallery Strip */}
              {galleryDocs.length > 1 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                    Dokumentasi lain di Provinsi {activeDoc.province} ({galleryDocs.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {galleryDocs.map((item) => {
                      const isCurrent = item.id === activeDoc.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onPointerDown={() => setActiveEvidenceModalDoc(item)}
                          className={`apple-pressable flex items-center gap-2.5 rounded-xl p-2 border text-left transition-colors ${
                            isCurrent
                              ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40'
                              : 'bg-[var(--surface-card)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <img
                            src={item.thumbnailDataUri}
                            alt={item.title}
                            className="h-12 w-20 rounded-lg object-cover shrink-0 border border-[var(--border-hairline)]"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {item.team}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
