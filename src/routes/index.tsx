import { createFileRoute } from '@tanstack/react-router'
import {
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
  ShadulerTasksOverlay,
  ShadulerTask,
  calculateShadulerData,
  type ShadulerTask as ShadulerTaskType,
  type ShadulerColumn,
} from '@/components/shaduler'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { AddTaskDialog } from '@/components/add-task-dialog'

export const Route = createFileRoute('/')({ component: App })

// Tip za data strukturu
type DayData = {
  date: string
  work_places: Array<{
    id: number
    label: string
    tasks: Array<{
      id: number
      name: string
      start_time: string
      end_time: string
      status: 'approved' | 'pending' | 'rejected'
    }>
  }>
}

function App() {
  const [selectedDate, setSelectedDate] = useState<number>(0)
  const [view, setView] = useState<'day' | '3days'>('day')
  const [layoutType, setLayoutType] = useState<'inline' | 'separate'>('inline')
  const [data, setData] = useState<DayData[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaults, setDialogDefaults] = useState<{
    date?: string
    workPlace?: number
    startTime?: string
    endTime?: string
  }>({})

  // Učitaj podatke iz API-ja
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data')
        if (response.ok) {
          const fetchedData = await response.json()
          setData(fetchedData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  const statusColors = {
    approved:
      'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    pending:
      'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    rejected:
      'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200 border-red-300 dark:border-red-700',
  }

  // Izvuci podatke za trenutni view mode
  const datesToShow = view === '3days' 
    ? data.slice(selectedDate, Math.min(selectedDate + 3, data.length))
    : [data[selectedDate]]

  // Pripremi kolone i taskove na osnovu view mode i layout tipa
  let columns: ShadulerColumn[] = []
  let tasks: ShadulerTaskType[] = []

  if (view === 'day') {
    // Single day view - jednostavno
    const currentData = data[selectedDate]
    if (currentData) {
      columns = currentData.work_places.map((wp) => ({
        id: wp.id,
        label: wp.label,
      }))
      tasks = currentData.work_places.flatMap((wp) =>
        wp.tasks.map((task) => ({
          id: `${selectedDate}-${wp.id}-${task.id}`,
          column: wp.id,
          name: task.name,
          start_time: task.start_time,
          end_time: task.end_time,
          status: task.status,
        }))
      )
    }
  } else {
    // 3 days view
    if (layoutType === 'inline') {
      // Pristup 1: Jedan red - "datum - naziv radnog mesta"
      columns = datesToShow.flatMap((dateData, dateIndex) =>
        dateData.work_places.map((wp) => ({
          id: `${selectedDate + dateIndex}-${wp.id}`,
          label: `${dateData.date} - ${wp.label}`,
          dateIndex: selectedDate + dateIndex,
          workPlaceId: wp.id,
        }))
      )
      tasks = datesToShow.flatMap((dateData, dateIndex) =>
        dateData.work_places.flatMap((wp) =>
          wp.tasks.map((task) => ({
            id: `${selectedDate + dateIndex}-${wp.id}-${task.id}`,
            column: `${selectedDate + dateIndex}-${wp.id}`,
            name: task.name,
            start_time: task.start_time,
            end_time: task.end_time,
            status: task.status,
          }))
        )
      )
    } else {
      // Pristup 2: Dva reda - prvo datumi, pa radna mesta
      // Za drugi red koristimo sve kolone svih datuma
      columns = datesToShow.flatMap((dateData) =>
        dateData.work_places.map((wp) => ({
          id: `${dateData.date}-${wp.id}`,
          label: wp.label,
          date: dateData.date,
          workPlaceId: wp.id,
        }))
      )
      tasks = datesToShow.flatMap((dateData) =>
        dateData.work_places.flatMap((wp) =>
          wp.tasks.map((task) => ({
            id: `${dateData.date}-${wp.id}-${task.id}`,
            column: `${dateData.date}-${wp.id}`,
            name: task.name,
            start_time: task.start_time,
            end_time: task.end_time,
            status: task.status,
          }))
        )
      )
    }
  }

  // Kalkulacije - koristimo iste startTime i endTime kao u ShadulerTimeColumn
  const hourHeight = 60
  const startTime = 0
  const endTime = 23
  const calculations = calculateShadulerData(
    columns,
    tasks,
    startTime,
    endTime,
    hourHeight,
  )

  // Ako nema podataka, prikaži loading ili prazan state
  if (data.length === 0) {
    return (
      <div className="container mx-auto flex items-center justify-center h-screen">
        <p>Učitavanje podataka...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <Shaduler>
        <ShadulerHeader>
          <ButtonGroup>
            <Button variant="outline" disabled={view === 'day'} onClick={() => setView('day')} className="cursor-pointer">
              Day
            </Button>
            <Button variant="outline" disabled={view === '3days'} onClick={() => setView('3days')} className="cursor-pointer">
              3 Days
            </Button>
          </ButtonGroup>
          {view === '3days' && (
            <ButtonGroup>
              <Button 
                variant="outline" 
                disabled={layoutType === 'inline'} 
                onClick={() => setLayoutType('inline')} 
                className="cursor-pointer"
              >
                Inline
              </Button>
              <Button 
                variant="outline" 
                disabled={layoutType === 'separate'} 
                onClick={() => setLayoutType('separate')} 
                className="cursor-pointer"
              >
                Separate
              </Button>
            </ButtonGroup>
          )}
          <ButtonGroup>
             <Button
               variant="outline"
               className="cursor-pointer"
               disabled={selectedDate === 0 || (view === '3days' && selectedDate >= data.length - 2)}
               onClick={() =>
                 setSelectedDate((prev) => {
                   if (prev === 0) {
                     return prev
                   } else {
                     return prev - 1
                   }
                 })
               }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <ButtonGroupText>
              {view === 'day' 
                ? data[selectedDate]?.date || '' 
                : `${data[selectedDate]?.date || ''} - ${data[Math.min(selectedDate + 2, data.length - 1)]?.date || ''}`
              }
            </ButtonGroupText>
            <Button
              variant="outline"
              className="cursor-pointer"
              disabled={view === 'day' ? selectedDate === data.length - 1 : selectedDate >= data.length - 3}
              onClick={() =>
                setSelectedDate((prev) => {
                  const maxDate = view === 'day' ? data.length - 1 : data.length - 3
                  if (prev >= maxDate) {
                    return 0
                  } else {
                    return prev + 1
                  }
                })
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </ButtonGroup>
        </ShadulerHeader>

        <ShadulerContent>
          <div className="relative">
            {view === '3days' && layoutType === 'separate' ? (
              // Separate layout: dva reda - datumi i radna mesta
              <div 
                className="sticky top-0 z-20 grid border-b bg-background"
                style={{
                  gridTemplateColumns: calculations.gridTemplateColumns,
                  gridTemplateRows: 'auto auto',
                }}
              >
                {/* Corner koji spanuje oba reda */}
                <ShadulerCorner 
                  className="flex items-center justify-center backdrop-blur-2xl border-r"
                  style={{
                    gridRow: '1 / 3',
                  }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <AddTaskDialog 
                    onTaskAdded={async () => {
                      // Refresh data nakon dodavanja taska
                      try {
                        const response = await fetch('/api/data')
                        if (response.ok) {
                          const fetchedData = await response.json()
                          setData(fetchedData)
                        }
                      } catch (error) {
                        console.error('Error refreshing data:', error)
                      }
                      setDialogOpen(false)
                    }}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen} 
                    defaultDate={dialogDefaults.date}
                    defaultWorkPlace={dialogDefaults.workPlace}
                    defaultStartTime={dialogDefaults.startTime}
                    defaultEndTime={dialogDefaults.endTime}
                  />
                </ShadulerCorner>
                
                {/* Prvi red - datumi */}
                <DateHeaders datesToShow={datesToShow} />
                
                {/* Drugi red - nazivi radnih mesta */}
                <ColumnsHeaders columns={columns} gridRow="2" />
              </div>
            ) : (
              // Inline layout ili single day: jedan red
              <ShadulerColumnsHeader
                columns={columns}
                gridTemplateColumns={calculations.gridTemplateColumns}
              >
                <ShadulerCorner className="flex items-center justify-center backdrop-blur-2xl">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <AddTaskDialog 
                    onTaskAdded={async () => {
                      // Refresh data nakon dodavanja taska
                      try {
                        const response = await fetch('/api/data')
                        if (response.ok) {
                          const fetchedData = await response.json()
                          setData(fetchedData)
                        }
                      } catch (error) {
                        console.error('Error refreshing data:', error)
                      }
                      setDialogOpen(false)
                    }}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    defaultDate={dialogDefaults.date || (view === 'day' ? data[selectedDate]?.date : undefined)}
                    defaultWorkPlace={dialogDefaults.workPlace}
                    defaultStartTime={dialogDefaults.startTime}
                    defaultEndTime={dialogDefaults.endTime}
                  />
                </ShadulerCorner>
                <ColumnsHeaders columns={columns} />
              </ShadulerColumnsHeader>
            )}
            <ShadulerGrid
              gridTemplateColumns={calculations.gridTemplateColumns}
              gridTemplateRows={calculations.gridTemplateRows}
            >
              <ShadulerTimeColumn
                timeFormat="24h"
                startTime={startTime}
                endTime={endTime}
              >
                <TimeSlots hours={calculations.hours} timeFormat="24h" />
              </ShadulerTimeColumn>
              <CellsGrid
                hours={calculations.hours}
                columns={columns}
                hourHeight={hourHeight}
                onCellClick={(column, hour) => {
                  // Pronađi datum i radno mesto na osnovu kolone
                  let targetDate: string | undefined
                  let targetWorkPlace: number | undefined

                  if (view === 'day') {
                    // Single day view - datum je jednostavno
                    targetDate = data[selectedDate]?.date
                    // U single day view, column.id je direktno work_place.id
                    targetWorkPlace = typeof column.id === 'number' ? column.id : (typeof column.id === 'string' ? parseInt(column.id) : undefined)
                  } else {
                    // 3 days view
                    if (layoutType === 'inline') {
                      // Format: "${selectedDate + dateIndex}-${wp.id}"
                      // Kolona ima dateIndex i workPlaceId properties
                      if ('dateIndex' in column && typeof column.dateIndex === 'number') {
                        targetDate = data[column.dateIndex]?.date
                      }
                      if ('workPlaceId' in column && typeof column.workPlaceId === 'number') {
                        targetWorkPlace = column.workPlaceId
                      }
                    } else {
                      // Format: "${dateData.date}-${wp.id}"
                      // Kolona ima date i workPlaceId properties
                      if ('date' in column && typeof column.date === 'string') {
                        targetDate = column.date
                      }
                      if ('workPlaceId' in column && typeof column.workPlaceId === 'number') {
                        targetWorkPlace = column.workPlaceId
                      }
                    }
                  }

                  // Izračunaj vreme
                  const startTime = `${hour.toString().padStart(2, '0')}:00`
                  const endHour = hour + 1
                  const endTime = `${endHour.toString().padStart(2, '0')}:00`

                  setDialogDefaults({
                    date: targetDate,
                    workPlace: targetWorkPlace,
                    startTime,
                    endTime,
                  })
                  setDialogOpen(true)
                }}
              />
              <ShadulerTasksOverlay
                taskPositions={calculations.taskPositions}
                columns={columns}
                timeColumnWidth={96}
                startHour={startTime}
                endHour={endTime}
                hourHeight={hourHeight}
              >
                {(taskPositions, columns) =>
                  columns.map((column, colIndex) => {
                    const positions = taskPositions[column.id] || []
                    return positions.map((pos) => {
                      const colorClass =
                        statusColors[
                          pos.task.status as keyof typeof statusColors
                        ] || statusColors.pending

                      return (
                        <ShadulerTask
                          key={pos.task.id}
                          task={pos.task}
                          position={pos}
                          columnIndex={colIndex}
                          totalColumns={columns.length}
                          onClick={() => {
                            console.log('Task clicked:', pos.task)
                          }}
                          onMouseEnter={() => {
                            console.log('Task hover:', pos.task)
                          }}
                        >
                          <div
                            className={`rounded px-2 py-1 border h-full flex items-center ${colorClass} backdrop-blur-2xl`}
                          >
                            {pos.task.name}
                          </div>
                        </ShadulerTask>
                      )
                    })
                  })
                }
              </ShadulerTasksOverlay>
            </ShadulerGrid>
          </div>
        </ShadulerContent>
      </Shaduler>
    </div>
  )
}

function ColumnsHeaders({ 
  columns, 
  gridRow 
}: { 
  columns: ShadulerColumn[]
  gridRow?: string
}) {
  return (
    <>
      {columns.map((column) => (
        <ShadulerColumnHeader
          key={column.id}
          column={column}
          onClick={() => {
            console.log('Column header clicked:', column.label)
          }}
          className="hover:bg-red-900/30 backdrop-blur-2xl"
          style={gridRow ? { gridRow } : undefined}
        >
          {column.label}
        </ShadulerColumnHeader>
      ))}
    </>
  )
}

function DateHeaders({ datesToShow }: { datesToShow: DayData[] }) {
  let colIndex = 2 // Počinje od 2 jer je 1 za corner koji spanuje
  
  return (
    <>
      {datesToShow.map((dateData) => {
        const workPlaceCount = dateData.work_places.length
        const startCol = colIndex
        const endCol = colIndex + workPlaceCount
        colIndex += workPlaceCount
        
        return (
          <div
            key={dateData.date}
            className="border-r border-b p-4 text-center font-semibold backdrop-blur-2xl"
            style={{
              gridColumn: `${startCol} / ${endCol}`,
              gridRow: '1',
            }}
          >
            {dateData.date}
          </div>
        )
      })}
    </>
  )
}

function TimeSlots({
  hours,
  timeFormat,
}: {
  hours: number[]
  timeFormat?: '24h' | '12h'
}) {
  return (
    <>
      {hours.map((hour, hourIndex) => (
        <ShadulerTimeSlot
          key={hour}
          hour={hour}
          timeFormat={timeFormat}
          hourIndex={hourIndex}
          hourHeight={60}
          onClick={() => {
            console.log('Time slot clicked:', hour)
          }}
        >
          {/* Default rendering - može se customizovati */}
        </ShadulerTimeSlot>
      ))}
    </>
  )
}

function CellsGrid({
  hours,
  columns,
  hourHeight,
  onCellClick,
}: {
  hours: number[]
  columns: ShadulerColumn[]
  hourHeight: number
  onCellClick?: (column: ShadulerColumn, hour: number) => void
}) {
  return (
    <>
      {hours.map((hour, hourIndex) =>
        columns.map((column, colIndex) => (
          <ShadulerCell
            key={`${column.id}-${hour}`}
            hour={hour}
            column={column}
            columnIndex={colIndex}
            hourIndex={hourIndex}
            hourHeight={hourHeight}
            onClick={() => {
              onCellClick?.(column, hour)
            }}
            onMouseEnter={() => {
              console.log('Cell hover:', column.label, hour)
            }}
            className="hover:bg-red-900/30 cursor-pointer"
          >
            {/* Default rendering - može se customizovati */}
          </ShadulerCell>
        )),
      )}
    </>
  )
}
