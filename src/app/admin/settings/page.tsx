'use client'

import * as React from 'react'
import { Save, Bell, Calendar, DollarSign, Users, Shield, Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { EVENT_SLUG } from '@/lib/config'

export default function AdminSettingsPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const [settings, setSettings] = React.useState({
    // Event Settings
    eventName: 'EthBoulder 2026',
    eventStatus: 'voting_open',
    votingCreditsPerUser: 100,
    sessionBudget: 10000,
    minSessionDuration: 30,
    maxSessionDuration: 120,

    // Voting Settings
    allowSessionProposals: true,
    allowVoting: true,
    allowMerges: true,
    requireApproval: true,
    votingDeadline: '2026-02-26T23:59',

    // Notification Settings
    notifyOnNewSession: true,
    notifyOnMergeRequest: true,
    notifyOnVotingMilestone: false,
    emailDigestFrequency: 'daily',

    // Advanced Settings
    enableQuadraticVoting: true,
    mergeBonus: 10,
    minVotesForScheduling: 5,
    autoSchedule: false,
  })

  // Load settings on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/events/${EVENT_SLUG}/settings`)
        if (response.ok) {
          const data = await response.json()
          setSettings(prev => ({
            ...prev,
            eventName: data.settings.eventName || prev.eventName,
            votingCreditsPerUser: data.settings.preVoteCredits || prev.votingCreditsPerUser,
            sessionBudget: data.settings.totalBudgetPool || prev.sessionBudget,
            votingDeadline: data.settings.preVoteDeadline
              ? new Date(data.settings.preVoteDeadline).toISOString().slice(0, 16)
              : prev.votingDeadline,
          }))
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleChange = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('Authentication required')
      setSaveStatus('error')
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/events/${EVENT_SLUG}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventName: settings.eventName,
          preVoteCredits: settings.votingCreditsPerUser,
          totalBudgetPool: settings.sessionBudget,
          preVoteDeadline: settings.votingDeadline ? new Date(settings.votingDeadline).toISOString() : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings')
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure event settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && errorMessage && (
            <span className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Event Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Event Information</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Event Name</label>
            <input
              type="text"
              value={settings.eventName}
              onChange={(e) => handleChange('eventName', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Event Status</label>
            <Select
              value={settings.eventStatus}
              onValueChange={(value) => handleChange('eventStatus', value)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposals_open">Proposals Open</SelectItem>
                <SelectItem value="voting_open">Voting Open</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live Now</SelectItem>
                <SelectItem value="concluded">Concluded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Voting Deadline</label>
            <input
              type="datetime-local"
              value={settings.votingDeadline}
              onChange={(e) => handleChange('votingDeadline', e.target.value)}
              className="w-64 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </Card>

      {/* Budget & Credits */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Budget & Credits</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              Voting Credits Per User
            </label>
            <input
              type="number"
              value={settings.votingCreditsPerUser}
              onChange={(e) =>
                handleChange('votingCreditsPerUser', parseInt(e.target.value))
              }
              className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">
              Total Session Budget ($)
            </label>
            <input
              type="number"
              value={settings.sessionBudget}
              onChange={(e) => handleChange('sessionBudget', parseInt(e.target.value))}
              className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Min Session Duration (min)
              </label>
              <input
                type="number"
                value={settings.minSessionDuration}
                onChange={(e) =>
                  handleChange('minSessionDuration', parseInt(e.target.value))
                }
                className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Max Session Duration (min)
              </label>
              <input
                type="number"
                value={settings.maxSessionDuration}
                onChange={(e) =>
                  handleChange('maxSessionDuration', parseInt(e.target.value))
                }
                className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Voting & Proposals */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Voting & Proposals</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Allow Session Proposals</label>
              <p className="text-xs text-muted-foreground mt-1">
                Let participants propose new sessions
              </p>
            </div>
            <Checkbox
              checked={settings.allowSessionProposals}
              onCheckedChange={() => handleToggle('allowSessionProposals')}
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Allow Voting</label>
              <p className="text-xs text-muted-foreground mt-1">
                Enable or disable voting functionality
              </p>
            </div>
            <Checkbox
              checked={settings.allowVoting}
              onCheckedChange={() => handleToggle('allowVoting')}
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Allow Session Merges</label>
              <p className="text-xs text-muted-foreground mt-1">
                Permit merging similar sessions
              </p>
            </div>
            <Checkbox
              checked={settings.allowMerges}
              onCheckedChange={() => handleToggle('allowMerges')}
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">
                Require Admin Approval
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Sessions need admin approval before voting
              </p>
            </div>
            <Checkbox
              checked={settings.requireApproval}
              onCheckedChange={() => handleToggle('requireApproval')}
            />
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">New Session Notifications</label>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified when new sessions are proposed
              </p>
            </div>
            <Checkbox
              checked={settings.notifyOnNewSession}
              onCheckedChange={() => handleToggle('notifyOnNewSession')}
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Merge Request Notifications</label>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified about session merge requests
              </p>
            </div>
            <Checkbox
              checked={settings.notifyOnMergeRequest}
              onCheckedChange={() => handleToggle('notifyOnMergeRequest')}
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Voting Milestone Notifications</label>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified at 25%, 50%, 75%, 100% participation
              </p>
            </div>
            <Checkbox
              checked={settings.notifyOnVotingMilestone}
              onCheckedChange={() => handleToggle('notifyOnVotingMilestone')}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Email Digest Frequency</label>
            <Select
              value={settings.emailDigestFrequency}
              onValueChange={(value) => handleChange('emailDigestFrequency', value)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Advanced Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Advanced Settings</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Enable Quadratic Voting</label>
              <p className="text-xs text-muted-foreground mt-1">
                Use quadratic cost formula for voting
              </p>
            </div>
            <Checkbox
              checked={settings.enableQuadraticVoting}
              onCheckedChange={() => handleToggle('enableQuadraticVoting')}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">
              Merge Bonus (%)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Vote bonus for merged sessions
            </p>
            <input
              type="number"
              value={settings.mergeBonus}
              onChange={(e) => handleChange('mergeBonus', parseInt(e.target.value))}
              className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">
              Minimum Votes for Scheduling
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Sessions need this many votes to be scheduled
            </p>
            <input
              type="number"
              value={settings.minVotesForScheduling}
              onChange={(e) =>
                handleChange('minVotesForScheduling', parseInt(e.target.value))
              }
              className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium block">Auto-Schedule Sessions</label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically schedule sessions based on votes
              </p>
            </div>
            <Checkbox
              checked={settings.autoSchedule}
              onCheckedChange={() => handleToggle('autoSchedule')}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Reset to Defaults</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
