'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Shield,
  Eye,
  Palette,
  Globe,
  Lock,
  Zap,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Container } from '@/components/layout/container'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SettingsPage() {
  const router = useRouter()
  const { user: authUser, logout } = useAuth()

  const handleSignOut = () => {
    logout()
    router.push('/')
  }

  const [settings, setSettings] = React.useState({
    // Event Preferences
    autoEnterEvents: true,
    defaultVotingStrategy: 'balanced',
    showEventRecommendations: true,

    // Notifications
    emailNewEvents: true,
    emailVotingReminders: true,
    emailSessionUpdates: false,
    inAppNotifications: true,
    pushNotifications: false,

    // Privacy
    showProfile: true,
    showVotingHistory: false,
    allowDataAnalytics: true,

    // Display
    theme: 'system',
    language: 'en',
    compactMode: false,
  })

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSelectChange = (key: keyof typeof settings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const user = authUser ? { name: authUser.displayName || 'User' } : { name: 'Guest' }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar user={user} onSignOut={handleSignOut} />

      <main className="flex-1 py-8">
        <Container>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage your event preferences and account settings
              </p>
            </div>

            {/* Event Preferences */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Event Preferences</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">
                      Auto-enter new events
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically join events from organizers you follow
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.autoEnterEvents}
                    onCheckedChange={() => handleToggle('autoEnterEvents')}
                  />
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block mb-2">
                      Default voting strategy
                    </label>
                    <Select
                      value={settings.defaultVotingStrategy}
                      onValueChange={(value) =>
                        handleSelectChange('defaultVotingStrategy', value)
                      }
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">
                          Conservative (save credits)
                        </SelectItem>
                        <SelectItem value="balanced">
                          Balanced (moderate spending)
                        </SelectItem>
                        <SelectItem value="aggressive">
                          Aggressive (spend freely)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">
                      Show event recommendations
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get personalized event suggestions based on your interests
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.showEventRecommendations}
                    onCheckedChange={() => handleToggle('showEventRecommendations')}
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
                <div>
                  <h3 className="text-sm font-medium mb-3">Email Notifications</h3>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm">New events</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Get notified when new events are created
                        </p>
                      </div>
                      <Checkbox
                        checked={settings.emailNewEvents}
                        onCheckedChange={() => handleToggle('emailNewEvents')}
                      />
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm">Voting reminders</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reminders before voting periods end
                        </p>
                      </div>
                      <Checkbox
                        checked={settings.emailVotingReminders}
                        onCheckedChange={() => handleToggle('emailVotingReminders')}
                      />
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm">Session updates</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Updates about sessions you voted for
                        </p>
                      </div>
                      <Checkbox
                        checked={settings.emailSessionUpdates}
                        onCheckedChange={() => handleToggle('emailSessionUpdates')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">App Notifications</h3>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm">In-app notifications</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Show notifications within the app
                        </p>
                      </div>
                      <Checkbox
                        checked={settings.inAppNotifications}
                        onCheckedChange={() => handleToggle('inAppNotifications')}
                      />
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm">Push notifications</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Receive push notifications on your device
                        </p>
                      </div>
                      <Checkbox
                        checked={settings.pushNotifications}
                        onCheckedChange={() => handleToggle('pushNotifications')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Privacy */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Privacy</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">
                      Public profile
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Make your profile visible to other participants
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.showProfile}
                    onCheckedChange={() => handleToggle('showProfile')}
                  />
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">
                      Show voting history
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Let others see what sessions you've voted for
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.showVotingHistory}
                    onCheckedChange={() => handleToggle('showVotingHistory')}
                  />
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">
                      Analytics and improvements
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Help us improve by sharing anonymous usage data
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.allowDataAnalytics}
                    onCheckedChange={() => handleToggle('allowDataAnalytics')}
                  />
                </div>
              </div>
            </Card>

            {/* Display Preferences */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Display</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block mb-2">Theme</label>
                    <Select
                      value={settings.theme}
                      onValueChange={(value) => handleSelectChange('theme', value)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block mb-2">Language</label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => handleSelectChange('language', value)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium block">Compact mode</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Show more content with reduced spacing
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.compactMode}
                    onCheckedChange={() => handleToggle('compactMode')}
                  />
                </div>
              </div>
            </Card>

            {/* Security */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Change Password
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Enable Two-Factor Authentication
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  View Active Sessions
                </Button>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save All Changes</Button>
            </div>
          </div>
        </Container>
      </main>
    </div>
  )
}
