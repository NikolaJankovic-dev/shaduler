import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface Task {
  id: number
  name: string
  start_time: string
  end_time: string
  status: 'approved' | 'pending' | 'rejected'
}

interface WorkPlace {
  id: number
  label: string
  tasks: Task[]
}

interface DayData {
  date: string
  work_places: WorkPlace[]
}

export const Route = createFileRoute('/api/data')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const filePath = join(process.cwd(), 'server', 'data.json')
          const data = await readFile(filePath, 'utf-8')
          return json(JSON.parse(data))
        } catch (error: any) {
          return json(
            { error: 'Error reading data', details: error.message },
            { status: 500 }
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const filePath = join(process.cwd(), 'server', 'data.json')
          const body = (await request.json()) as {
            date: string
            work_place_id: number
            task: Omit<Task, 'id'>
          }

          // Čitaj postojeće podatke
          const allData: DayData[] = JSON.parse(
            await readFile(filePath, 'utf-8').catch(() => '[]')
          )

          // Pronađi ili kreiraj datum
          let dayData = allData.find((d) => d.date === body.date)
          if (!dayData) {
            dayData = {
              date: body.date,
              work_places: [
                { id: 1, label: 'Radno mesto 1', tasks: [] },
                { id: 2, label: 'Radno mesto 2', tasks: [] },
                { id: 3, label: 'Radno mesto 3', tasks: [] },
              ],
            }
            allData.push(dayData)
            // Sortiraj po datumu
            allData.sort((a, b) => a.date.localeCompare(b.date))
          }

          // Pronađi radno mesto
          const workPlace = dayData.work_places.find(
            (wp) => wp.id === body.work_place_id
          )
          if (!workPlace) {
            return json(
              { error: `Work place with id ${body.work_place_id} not found` },
              { status: 400 }
            )
          }

          // Generiši novi ID
          const maxId = workPlace.tasks.reduce(
            (max, task) => Math.max(max, task.id),
            0
          )
          const newTask: Task = {
            ...body.task,
            id: maxId + 1,
          }

          // Dodaj task
          workPlace.tasks.push(newTask)

          // Snimi podatke
          await writeFile(filePath, JSON.stringify(allData, null, 2))

          return json({ success: true, task: newTask })
        } catch (error: any) {
          return json(
            { error: 'Error saving task', details: error.message },
            { status: 500 }
          )
        }
      },
    },
  },
})
