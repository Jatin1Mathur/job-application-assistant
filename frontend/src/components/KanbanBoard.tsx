import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUSES } from '../api.ts'
import type { Application, ApplicationStatus } from '../api.ts'
import { scoreTone } from '../lib/format.ts'
import { statusLabel } from '../lib/status.ts'
import AnimatedNumber from './AnimatedNumber.tsx'
import { StatusDot } from './StatusBadge.tsx'

function CardBody({ application }: { application: Application }) {
  return (
    <>
      <p className="line-clamp-2 text-sm font-semibold leading-snug">{application.jobTitle}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{application.companyName}</p>
      <p className="mt-2 text-xs">
        {application.matchScore === null ? (
          <span className="text-muted-foreground">Not analyzed</span>
        ) : (
          <span className={`font-semibold tabular-nums ${scoreTone(application.matchScore).text}`}>
            {application.matchScore}
            <span className="font-normal text-muted-foreground"> / 100 match</span>
          </span>
        )}
      </p>
    </>
  )
}

// One application on the board. The grip handle is what you drag; the rest of the card is a normal link
function BoardCard({ application }: { application: Application }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: application.id })
  return (
    // layout + layoutId: when the status changes, the card glides from its old column to the new one,
    // and the cards around it slide to close the gap, instead of everything jumping
    <motion.li
      ref={setNodeRef}
      layout
      layoutId={`application-${application.id}`}
      transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
      data-testid={`board-card-${application.id}`}
      className={`flex rounded-xl border bg-card transition-shadow hover:shadow-raised ${isDragging ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        aria-label={`Move ${application.jobTitle} at ${application.companyName}`}
        className="flex cursor-grab touch-none items-center rounded-l-xl px-1.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-4" />
      </button>
      <Link to={`/applications/${application.id}`} state={{ application }} className="min-w-0 flex-1 rounded-r-xl py-3 pr-3">
        <CardBody application={application} />
      </Link>
    </motion.li>
  )
}

function Column({ status, applications }: { status: ApplicationStatus; applications: Application[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      data-testid={`board-column-${status}`}
      aria-label={`${statusLabel(status)}, ${applications.length} applications`}
      className={`flex w-64 shrink-0 snap-start flex-col rounded-xl border p-2.5 transition-colors lg:w-auto lg:min-w-0 lg:flex-1 ${
        isOver ? 'border-primary/50 bg-accent/70' : 'bg-muted/40'
      }`}
    >
      <h2 className="flex items-center gap-2 px-1.5 pb-2.5 pt-1 text-sm font-semibold">
        <StatusDot status={status} />
        {statusLabel(status)}
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border">
          <AnimatedNumber value={applications.length} />
        </span>
      </h2>
      <ul className="flex min-h-24 flex-1 flex-col gap-2">
        {applications.map((application) => (
          <BoardCard key={application.id} application={application} />
        ))}
        {applications.length === 0 && (
          <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Drop an application here
          </li>
        )}
      </ul>
    </section>
  )
}

// The applications as a board with one column per status. Dragging a card to another column changes its status.
export default function KanbanBoard({
  applications,
  onMove,
}: {
  applications: Application[]
  onMove: (application: Application, status: ApplicationStatus) => void
}) {
  const [dragged, setDragged] = useState<Application | null>(null)
  const sensors = useSensors(
    // A small distance before a drag starts, so a simple click is not mistaken for a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // On a touch screen: press and hold briefly, so scrolling the page still works
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    // Keyboard: focus the grip, press Space, move with the arrow keys, press Space again to drop
    useSensor(KeyboardSensor),
  )

  function onDragStart(event: DragStartEvent) {
    setDragged(applications.find((application) => application.id === event.active.id) ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setDragged(null)
    const application = applications.find((item) => item.id === event.active.id)
    const status = event.over?.id as ApplicationStatus | undefined
    if (application && status && status !== application.status) {
      onMove(application, status)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragged(null)}>
      {/* On a phone the columns scroll sideways inside this box; the page itself does not */}
      <div className="relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            applications={applications.filter((application) => application.status === status)}
          />
        ))}
      </div>
      <DragOverlay>
        {dragged && (
          <div className="w-60 rotate-2 cursor-grabbing rounded-xl border bg-card p-3 shadow-pop">
            <CardBody application={dragged} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
