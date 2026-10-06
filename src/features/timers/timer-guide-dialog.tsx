import { BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'
import { StatusBadge } from '../../shared/components/status-badge'

const statuses = [
  { id: 'scheduled', description: 'Timer terjadwal dan menunggu waktu Due at.' },
  { id: 'running', description: 'Timer sedang diproses untuk melanjutkan alur simulasi.' },
  {
    id: 'retry',
    description:
      'Percobaan sebelumnya gagal. Timer dijadwalkan untuk mencoba kembali pada Due at yang baru.',
  },
  {
    id: 'completed',
    description:
      'Pemrosesan timer sudah selesai. Status ini tidak berarti seluruh simulasi sudah selesai.',
  },
  {
    id: 'failed',
    description:
      'Pemrosesan timer gagal dan batas percobaan sudah tercapai. Buka Details untuk melihat error terakhir.',
  },
  {
    id: 'cancelled',
    description:
      'Timer dibatalkan sehingga jadwalnya tidak dijalankan. Pembatalan dapat terjadi melalui tombol Cancel atau saat penantian sudah terselesaikan. Timer cancelled tidak dapat di-reschedule.',
  },
]

const fields = [
  {
    label: 'Countdown',
    description:
      'Sisa waktu menuju Due at, dalam detik. Ditampilkan untuk timer scheduled dan retry. Nilai 0s berarti waktu jadwal sudah tercapai; pemrosesan bisa masih menunggu.',
  },
  {
    label: 'Due at',
    description:
      'Waktu timer dijadwalkan untuk diproses. Waktu ini dapat berubah setelah Reschedule, Run now, atau retry.',
  },
  {
    label: 'Created at',
    description:
      'Waktu record timer pertama kali dibuat. Waktu ini tidak berubah saat timer dijadwalkan ulang.',
  },
  {
    label: 'Timeout',
    description:
      'Selisih Due at dan Created at dalam detik. Nilai ini dapat berubah setelah jadwal diubah atau retry, sehingga tidak selalu sama dengan timeout awal pada konfigurasi node.',
  },
  {
    label: 'Cancel at',
    description:
      'Waktu timer dibatalkan. Tanda — berarti tidak ada waktu pembatalan yang tercatat. Keterangan di bawahnya menunjukkan selisih waktu pembatalan terhadap Due at.',
  },
]

function TimerGuideContent() {
  return (
    <div className="grid gap-6 text-sm leading-relaxed text-slate-600">
      <section aria-labelledby="timer-guide-statuses">
        <h3 id="timer-guide-statuses" className="mb-3 font-semibold text-slate-900">
          Status timer
        </h3>
        <dl className="grid gap-3">
          {statuses.map((status) => (
            <div key={status.id} className="grid gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4">
              <dt>
                <StatusBadge status={status.id} />
              </dt>
              <dd>{status.description}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="timer-guide-times">
        <h3 id="timer-guide-times" className="mb-1 font-semibold text-slate-900">
          Waktu dan durasi
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Due at, Created at, dan Cancel at ditampilkan dalam WIB (Asia/Jakarta, UTC+7).
        </p>
        <dl className="grid gap-3">
          {fields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="font-semibold text-slate-800">{field.label}</dt>
              <dd>{field.description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

export function TimerGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:outline-none"
        >
          <BookOpen size={13} aria-hidden="true" />
          Panduan
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-[640px]">
        <DialogTitle>Panduan timer</DialogTitle>
        <DialogDescription>Arti status dan kolom waktu pada tabel Timers.</DialogDescription>
        <TimerGuideContent />
      </DialogContent>
    </Dialog>
  )
}
