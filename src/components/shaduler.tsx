import * as React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface ShadulerTask {
  id: string | number
  column: string | number // ID kolone (mora odgovarati column.id)
  name: string
  start_time: string // Format: "HH:MM"
  end_time: string // Format: "HH:MM"
  [key: string]: any // Dodatni custom properties
}

export interface ShadulerColumn {
  id: string | number
  label: string
  [key: string]: any // Dodatni custom properties
}

export type TimeFormat = '24h' | '12h'

export interface ShadulerProps extends React.ComponentProps<'div'> {
  children?: React.ReactNode
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatTime = (
  hour: number,
  format: TimeFormat = '24h',
): string => {
  if (format === '12h') {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }
  return `${hour.toString().padStart(2, '0')}:00`
}

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const generateHours = (startHour: number, endHour: number): number[] => {
  return Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
}

export const groupTasksByColumn = (
  tasks: ShadulerTask[],
  columns: ShadulerColumn[],
): Record<string | number, ShadulerTask[]> => {
  const grouped: Record<string | number, ShadulerTask[]> = {}
  columns.forEach((col) => {
    grouped[col.id] = tasks.filter((task) => task.column === col.id)
  })
  return grouped
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

export interface TaskPosition {
  task: ShadulerTask
  top: number
  height: number
  columnIndex: number
  groupIndex?: number
  groupCount?: number
}

// Helper interface za kalkulacije
export interface ShadulerCalculations {
  hours: number[]
  tasksByColumn: Record<string | number, ShadulerTask[]>
  taskPositions: Record<string | number, TaskPosition[]>
  gridTemplateColumns: string
  gridTemplateRows: string
}

// Helper funkcija za kalkulacije
const calculateShadulerData = (
  columns: ShadulerColumn[],
  tasks: ShadulerTask[],
  startHour: number,
  endHour: number,
  hourHeight: number,
): ShadulerCalculations => {
  const hours = generateHours(startHour, endHour)
  const tasksByColumn = groupTasksByColumn(tasks, columns)
  const taskPositions = calculateAllTaskPositions(
    columns,
    tasksByColumn,
    startHour,
    endHour,
    hourHeight,
  )
  const gridTemplateColumns = `96px repeat(${columns.length}, 1fr)`
  // Grid ima samo redove za sate (bez header-a)
  const gridTemplateRows = `repeat(${endHour - startHour}, ${hourHeight}px)`

  return {
    hours,
    tasksByColumn,
    taskPositions,
    gridTemplateColumns,
    gridTemplateRows,
  }
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

const calculateTaskPositions = (
  tasks: ShadulerTask[],
  columnIndex: number,
  startHour: number,
  endHour: number,
  hourHeight: number,
): TaskPosition[] => {
  const startMinutes = startHour * 60
  const endMinutes = endHour * 60

  // Filtrirati taskove koji su van opsega
  const taskData = tasks
    .map((task) => ({
      task,
      start: timeToMinutes(task.start_time),
      end: timeToMinutes(task.end_time),
    }))
    .filter((td) => {
      // Task je vidljiv ako se preklapa sa opsegom
      return !(td.end <= startMinutes || td.start >= endMinutes)
    })
    .map((td) => ({
      ...td,
      // Clamp start i end na opseg
      start: Math.max(td.start, startMinutes),
      end: Math.min(td.end, endMinutes),
    }))

  taskData.sort((a, b) => a.start - b.start)

  const groups: (typeof taskData)[] = []
  let currentGroup: typeof taskData = []

  for (const td of taskData) {
    if (currentGroup.length === 0) {
      currentGroup.push(td)
      continue
    }

    const overlaps = currentGroup.some(
      (cg) => !(td.end <= cg.start || td.start >= cg.end),
    )

    if (overlaps) {
      currentGroup.push(td)
    } else {
      groups.push(currentGroup)
      currentGroup = [td]
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  const positions: TaskPosition[] = []

  for (const group of groups) {
    group.forEach((td, index) => {
      const startMinutesOffset = td.start - startHour * 60
      const endMinutesOffset = td.end - startHour * 60

      const top = (startMinutesOffset / 60) * hourHeight
      const height = ((endMinutesOffset - startMinutesOffset) / 60) * hourHeight

      positions.push({
        task: td.task,
        top,
        height,
        columnIndex,
        groupIndex: group.length > 1 ? index : undefined,
        groupCount: group.length > 1 ? group.length : undefined,
      })
    })
  }

  return positions
}

const calculateAllTaskPositions = (
  columns: ShadulerColumn[],
  tasksByColumn: Record<string | number, ShadulerTask[]>,
  startHour: number,
  endHour: number,
  hourHeight: number,
): Record<string | number, TaskPosition[]> => {
  const positions: Record<string | number, TaskPosition[]> = {}
  columns.forEach((col, colIndex) => {
    positions[col.id] = calculateTaskPositions(
      tasksByColumn[col.id] || [],
      colIndex,
      startHour,
      endHour,
      hourHeight,
    )
  })
  return positions
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

export interface ShadulerHeaderProps extends React.ComponentProps<'div'> {
  children?: React.ReactNode
}

const ShadulerHeader = React.forwardRef<HTMLDivElement, ShadulerHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex justify-between items-center border-b p-4 bg-background sticky top-0 z-30',
          className,
        )}
        {...props}
      >
        {children ?? (
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 border rounded flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Dodaj zadatak"
            >
              <span className="text-lg">+</span>
            </button>
            <h1 className="text-2xl font-bold">Shaduler</h1>
          </div>
        )}
      </div>
    )
  },
)
ShadulerHeader.displayName = 'ShadulerHeader'

export interface ShadulerContentProps extends React.ComponentProps<'div'> {}

const ShadulerContent = React.forwardRef<HTMLDivElement, ShadulerContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 overflow-auto scrollbar-thin', className)}
        {...props}
      />
    )
  },
)
ShadulerContent.displayName = 'ShadulerContent'

export interface ShadulerGridProps extends React.ComponentProps<'div'> {
  gridTemplateColumns: string
  gridTemplateRows: string
}

const ShadulerGrid = React.forwardRef<HTMLDivElement, ShadulerGridProps>(
  ({ className, gridTemplateColumns, gridTemplateRows, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative grid w-full', className)}
        style={{
          gridTemplateColumns,
          gridTemplateRows,
          ...props.style,
        }}
        {...props}
      />
    )
  },
)
ShadulerGrid.displayName = 'ShadulerGrid'

export interface ShadulerColumnsHeaderProps extends React.ComponentProps<'div'> {
  columns: ShadulerColumn[]
  gridTemplateColumns: string
}

const ShadulerColumnsHeader = React.forwardRef<
  HTMLDivElement,
  ShadulerColumnsHeaderProps
>(({ className, children, columns, gridTemplateColumns, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('sticky top-0 z-20 border-b bg-background grid w-full min-h-[57px]', className)}
        style={{
          gridTemplateColumns,
          ...props.style,
        }}
        {...props}
      >
      {children ?? (
        <>
          {columns.map((column) => (
            <ShadulerColumnHeader key={column.id} column={column}>
              {column.label}
            </ShadulerColumnHeader>
          ))}
        </>
      )}
    </div>
  )
})
ShadulerColumnsHeader.displayName = 'ShadulerColumnsHeader'

export interface ShadulerColumnHeaderProps extends React.ComponentProps<'div'> {
  column: ShadulerColumn
}

const ShadulerColumnHeader = React.forwardRef<
  HTMLDivElement,
  ShadulerColumnHeaderProps
>(({ className, column, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('border-r p-4 text-center font-semibold', className)}
      {...props}
    >
      {children ?? column.label}
    </div>
  )
})
ShadulerColumnHeader.displayName = 'ShadulerColumnHeader'

export interface ShadulerCornerProps extends React.ComponentProps<'div'> {}

const ShadulerCorner = React.forwardRef<HTMLDivElement, ShadulerCornerProps>(
  ({ className, children, ...props }, ref) => {
    // Ako nema children, ne renderujemo ništa
    if (!children) {
      return <div className="border-r p-4"></div>
    }

    return (
      <div ref={ref} className={cn('border-r p-4', className)} {...props}>
        {children}
      </div>
    )
  },
)
ShadulerCorner.displayName = 'ShadulerCorner'

export interface ShadulerTimeColumnProps extends React.ComponentProps<'div'> {
  startTime?: number
  endTime?: number
  timeFormat?: TimeFormat
}

const ShadulerTimeColumn = React.forwardRef<
  HTMLDivElement,
  ShadulerTimeColumnProps
>(
  (
    {
      className,
      children,
      startTime = 0,
      endTime = 23,
      timeFormat = '24h',
      ...props
    },
    ref,
  ) => {
    const hours = generateHours(startTime, endTime)

    return (
      <div
        ref={ref}
        className={cn('sticky left-0 z-10 bg-background flex flex-col', className)}
        style={{
          gridColumn: '1',
          gridRow: `1 / ${hours.length + 1}`,
          ...props.style,
        }}
        {...props}
      >
        {children ??
          hours.map((hour, hourIndex) => (
            <ShadulerTimeSlot
              key={hour}
              hour={hour}
              timeFormat={timeFormat}
              hourIndex={hourIndex}
            />
          ))}
      </div>
    )
  },
)
ShadulerTimeColumn.displayName = 'ShadulerTimeColumn'

export interface ShadulerTimeSlotProps extends React.ComponentProps<'div'> {
  hour: number
  hourHeight?: number
  timeFormat?: TimeFormat
  hourIndex: number
}

const ShadulerTimeSlot = React.forwardRef<
  HTMLDivElement,
  ShadulerTimeSlotProps
>(
  (
    {
      className,
      hour,
      children,
      hourHeight = 60,
      timeFormat = '24h',
      hourIndex,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('border-r border-b relative', className)}
        style={{
          height: `${hourHeight}px`,
          ...props.style,
        }}
        {...props}
      >
        {children ?? (
          <div
            className={cn('absolute left-[50%] -translate-x-1/2 w-fit bg-background px-2 text-sm text-muted-foreground', hourIndex === 0 ? 'top-2' : '-top-3')}
          >
            {formatTime(hour, timeFormat)}
          </div>
        )}
      </div>
    )
  },
)
ShadulerTimeSlot.displayName = 'ShadulerTimeSlot'

export interface ShadulerCellProps extends React.ComponentProps<'div'> {
  hour: number
  column: ShadulerColumn
  columnIndex: number
  hourIndex: number
  hourHeight?: number
}

const ShadulerCell = React.forwardRef<HTMLDivElement, ShadulerCellProps>(
  (
    {
      className,
      hour,
      column,
      columnIndex,
      hourIndex,
      hourHeight = 60,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-r border-b relative cursor-pointer hover:bg-muted/20 transition-colors',
          className,
        )}
        style={{
          gridColumn: columnIndex + 2,
          gridRow: hourIndex + 1,
          height: `${hourHeight}px`,
          ...props.style,
        }}
        onClick={(e) => {
          onClick?.(e)
        }}
        {...props}
      >
        {children ?? <div className="absolute inset-0" style={{ padding: '4px' }}></div>}
      </div>
    )
  },
)
ShadulerCell.displayName = 'ShadulerCell'

export interface ShadulerCellsProps {
  children?: React.ReactNode
  hours: number[]
  columns: ShadulerColumn[]
  hourHeight?: number
}

const ShadulerCells = ({
  children,
  hours,
  columns,
  hourHeight = 60,
}: ShadulerCellsProps) => {
  return (
    <>
      {children ??
        hours.map((hour, hourIndex) =>
          columns.map((column, colIndex) => (
            <ShadulerCell
              key={`${column.id}-${hour}`}
              hour={hour}
              column={column}
              columnIndex={colIndex}
              hourIndex={hourIndex}
              hourHeight={hourHeight}
            />
          )),
        )}
    </>
  )
}
ShadulerCells.displayName = 'ShadulerCells'

export interface ShadulerTaskProps extends React.ComponentProps<'div'> {
  task: ShadulerTask
  position: TaskPosition
  columnIndex: number
  totalColumns: number
}

const ShadulerTask = React.forwardRef<HTMLDivElement, ShadulerTaskProps>(
  (
    {
      className,
      task,
      position,
      columnIndex,
      totalColumns,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const groupCount = position.groupCount || 1
    const groupIndex = position.groupIndex ?? 0

    const columnLeftPercent = (columnIndex / totalColumns) * 100
    const columnWidthPercent = 100 / totalColumns

    let taskLeftPercent = 0
    let taskWidthPercent = 90

    if (groupCount > 1) {
      taskWidthPercent = 90 / groupCount
      taskLeftPercent = groupIndex * taskWidthPercent
    }

    const totalLeftPercent =
      columnLeftPercent + (taskLeftPercent * columnWidthPercent) / 100
    const totalWidthPercent = (taskWidthPercent * columnWidthPercent) / 100

    return (
      <div
        ref={ref}
        className={cn(
          'absolute pointer-events-auto cursor-pointer z-10 box-border',
          className,
        )}
        style={{
          left: `${totalLeftPercent}%`,
          width: `${totalWidthPercent}%`,
          top: `${position.top}px`,
          height: `${position.height}px`,
          ...props.style,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(e)
        }}
        {...props}
      >
        {children ?? (
          <div className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-300 dark:border-blue-700 h-full flex items-center">
            {task.name}
          </div>
        )}
      </div>
    )
  },
)
ShadulerTask.displayName = 'ShadulerTask'

export interface ShadulerTasksOverlayProps extends Omit<
  React.ComponentProps<'div'>,
  'children'
> {
  children?:
    | React.ReactNode
    | ((
        taskPositions: Record<string | number, TaskPosition[]>,
        columns: ShadulerColumn[],
      ) => React.ReactNode)
  taskPositions: Record<string | number, TaskPosition[]>
  columns: ShadulerColumn[]
  timeColumnWidth?: number
  hourHeight?: number
  startHour?: number
  endHour?: number
}

const ShadulerTasksOverlay = React.forwardRef<
  HTMLDivElement,
  ShadulerTasksOverlayProps
>(
  (
    {
      className,
      children,
      taskPositions,
      columns,
      timeColumnWidth = 96,
      hourHeight = 60,
      startHour = 0,
      endHour = 24,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('absolute pointer-events-none top-0 right-0', className)}
        style={{
          left: `${timeColumnWidth}px`,
          height: `${(endHour - startHour) * hourHeight}px`,
          ...props.style,
        }}
        {...props}
      >
        {typeof children === 'function'
          ? children(taskPositions, columns)
          : (children ??
            columns.map((column, colIndex) => {
              const positions = taskPositions[column.id] || []
              return positions.map((pos) => (
                <ShadulerTask
                  key={pos.task.id}
                  task={pos.task}
                  position={pos}
                  columnIndex={colIndex}
                  totalColumns={columns.length}
                />
              ))
            }))}
      </div>
    )
  },
)
ShadulerTasksOverlay.displayName = 'ShadulerTasksOverlay'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Shaduler = React.forwardRef<HTMLDivElement, ShadulerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full border rounded-lg overflow-hidden flex flex-col',
          'h-[calc(100vh-64px)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Shaduler.displayName = 'Shaduler'

// Export svih komponenti i helper funkcija
export {
  Shaduler,
  ShadulerHeader,
  ShadulerContent,
  ShadulerGrid,
  ShadulerColumnsHeader,
  ShadulerColumnHeader,
  ShadulerCorner,
  ShadulerTimeColumn,
  ShadulerTimeSlot,
  ShadulerCell,
  ShadulerCells,
  ShadulerTask,
  ShadulerTasksOverlay,
  calculateShadulerData,
}
