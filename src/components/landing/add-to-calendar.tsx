'use client'

import { Calendar, Download, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface AddToCalendarProps {
  eventName?: string
  startDate?: string
  endDate?: string
  location?: string
  description?: string
}

export function AddToCalendar({
  eventName = 'EthBoulder 2026',
  startDate = '2026-02-13',
  endDate = '2026-02-15',
  location = 'Boulder, Colorado',
  description = 'Shape the Unconference Agenda - Propose sessions, vote on what matters, and help build the most relevant conversations in Web3.',
}: AddToCalendarProps) {
  const startTime = '09:00:00'
  const endTime = '18:00:00'

  function formatGoogleCalendarUrl() {
    const start = startDate.replace(/-/g, '') + 'T' + startTime.replace(/:/g, '')
    const end = endDate.replace(/-/g, '') + 'T' + endTime.replace(/:/g, '')

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventName,
      dates: `${start}/${end}`,
      details: description,
      location: location,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  function generateIcsFile() {
    const start = startDate.replace(/-/g, '') + 'T' + startTime.replace(/:/g, '')
    const end = endDate.replace(/-/g, '') + 'T' + endTime.replace(/:/g, '')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EthBoulder//Unconference//EN
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${eventName}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'eth-boulder-2026.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Format date range for display
  const formatDateDisplay = () => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const month = start.toLocaleDateString('en-US', { month: 'short' })
    return `${month} ${start.getDate()}-${end.getDate()}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/20 text-sm cursor-pointer hover:border-primary/40 transition-colors dark:bg-white/5 [.light_&]:bg-black [.light_&]:border-black/20">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">{eventName}</span>
          <span className="text-white [.light_&]:text-white">• {formatDateDisplay()}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 bg-white/20 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-full shadow-xl"
        align="center"
        sideOffset={8}
      >
        <div className="flex items-center gap-2">
          <a
            href={formatGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-sm font-medium"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add to Google Calendar
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={generateIcsFile}
            className="rounded-full px-4 text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Download .ics file
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
