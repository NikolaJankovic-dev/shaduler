'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddTaskDialogProps {
  onTaskAdded?: () => void
  defaultDate?: string
  defaultWorkPlace?: number
  defaultStartTime?: string
  defaultEndTime?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddTaskDialog({
  onTaskAdded,
  defaultDate,
  defaultWorkPlace,
  defaultStartTime,
  defaultEndTime,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddTaskDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  
  const [loading, setLoading] = React.useState(false)
  
  // Recalculate end time based on start time (default +1 hour)
  const calculateEndTime = (start: string) => {
    const [hours, minutes] = start.split(':').map(Number)
    const endHour = hours + 1
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const [formData, setFormData] = React.useState({
    date: defaultDate || new Date().toISOString().split('T')[0],
    work_place_id: defaultWorkPlace?.toString() || '1',
    name: '',
    description: '',
    start_time: defaultStartTime || '08:00',
    end_time: defaultEndTime || calculateEndTime(defaultStartTime || '08:00'),
    status: 'pending' as 'approved' | 'pending' | 'rejected',
  })

  // Update form data when dialog opens with new defaults
  React.useEffect(() => {
    if (open) {
      // Reset i popuni formu sa default vrednostima kada se dialog otvori
      setFormData({
        date: defaultDate || new Date().toISOString().split('T')[0],
        work_place_id: defaultWorkPlace?.toString() || '1',
        name: '',
        description: '',
        start_time: defaultStartTime || '08:00',
        end_time: defaultEndTime || calculateEndTime(defaultStartTime || '08:00'),
        status: 'pending',
      })
    }
  }, [open, defaultDate, defaultWorkPlace, defaultStartTime, defaultEndTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          work_place_id: Number(formData.work_place_id),
          task: {
            name: formData.name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            status: formData.status,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      setOpen(false)
      onTaskAdded?.()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Greška pri kreiranju taska. Pokušajte ponovo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Dodaj novi task</DialogTitle>
            <DialogDescription>
              Popunite formu da biste kreirali novi task
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="work_place">Radno mesto</Label>
              <Select
                value={formData.work_place_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, work_place_id: value })
                }
              >
                <SelectTrigger id="work_place">
                  <SelectValue placeholder="Izaberite radno mesto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Radno mesto 1</SelectItem>
                  <SelectItem value="2">Radno mesto 2</SelectItem>
                  <SelectItem value="3">Radno mesto 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Naziv taska</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Unesite naziv taska"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Unesite opis taska (opciono)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_time">Vreme početka</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_time">Vreme kraja</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'approved' | 'pending' | 'rejected') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Izaberite status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Čuvanje...' : 'Dodaj task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PlusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

