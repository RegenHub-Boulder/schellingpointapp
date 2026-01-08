'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Upload, Loader2, Lock, Wallet, Globe, X } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useProfile, ProfileUpdate } from '@/hooks/use-profile'
import { useAuth } from '@/hooks'

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, error, updateProfile } = useProfile()

  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editedProfile, setEditedProfile] = React.useState<ProfileUpdate>({})
  const [newInterest, setNewInterest] = React.useState('')

  const loading = authLoading || profileLoading

  // Initialize editedProfile when profile loads
  React.useEffect(() => {
    if (profile) {
      setEditedProfile({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        topics: profile.topics || [],
        payoutAddress: profile.payoutAddress || '',
        ensAddress: profile.ensAddress || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateProfile(editedProfile)
    setIsSaving(false)

    if (result.success) {
      setIsEditing(false)
    } else {
      alert(result.error || 'Failed to save profile')
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditedProfile({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        topics: profile.topics || [],
        payoutAddress: profile.payoutAddress || '',
        ensAddress: profile.ensAddress || '',
      })
    }
    setIsEditing(false)
  }

  const handleAddInterest = () => {
    if (newInterest.trim() && !editedProfile.topics?.includes(newInterest.trim())) {
      setEditedProfile({
        ...editedProfile,
        topics: [...(editedProfile.topics || []), newInterest.trim()],
      })
      setNewInterest('')
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setEditedProfile({
      ...editedProfile,
      topics: editedProfile.topics?.filter(t => t !== interest) || [],
    })
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar user={undefined} onSignOut={handleSignOut} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  // Not signed in
  if (!user || error?.includes('sign in')) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar user={undefined} onSignOut={handleSignOut} />
        <main className="flex-1 py-8">
          <Container>
            <div className="max-w-4xl mx-auto">
              <Card className="p-12">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Please sign in to view and manage your profile
                  </p>
                  <Button asChild>
                    <a href="/auth">Sign In</a>
                  </Button>
                </div>
              </Card>
            </div>
          </Container>
        </main>
      </div>
    )
  }

  const navUser = {
    name: profile?.displayName || profile?.email || 'User',
    avatar: profile?.avatarUrl || '',
  }

  const displayName = profile?.displayName || profile?.email?.split('@')[0] || 'User'
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar user={navUser} onSignOut={handleSignOut} />

      <main className="flex-1 py-8">
        <Container>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Profile</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your personal information and preferences
                </p>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Picture */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {isEditing && (
                  <div>
                    <Button variant="outline" size="sm" disabled>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Photo upload coming soon
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Personal Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.displayName || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, displayName: e.target.value })
                      }
                      placeholder="Enter your display name"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {profile?.displayName || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Email</label>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {profile?.email}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.bio || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {profile?.bio || <span className="italic">No bio yet</span>}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Web3 Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Web3 Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Smart Wallet Address
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    {profile?.smartWalletAddress ? (
                      <span className="font-mono text-xs">
                        {profile.smartWalletAddress}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Not set</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    ENS Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.ensAddress || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, ensAddress: e.target.value })
                      }
                      placeholder="yourname.eth"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {profile?.ensAddress || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Payout Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.payoutAddress || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, payoutAddress: e.target.value })
                      }
                      placeholder="0x... or yourname.eth"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      {profile?.payoutAddress ? (
                        <span className="font-mono text-xs">{profile.payoutAddress}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Address for receiving fund distributions
                  </p>
                </div>
              </div>
            </Card>

            {/* Interests */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {(isEditing ? editedProfile.topics : profile?.topics)?.map((interest) => (
                  <div
                    key={interest}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1"
                  >
                    {interest}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveInterest(interest)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {(!isEditing && (!profile?.topics || profile.topics.length === 0)) && (
                  <p className="text-sm text-muted-foreground italic">No interests added yet</p>
                )}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-4">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                    placeholder="Add an interest..."
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddInterest}>
                    Add
                  </Button>
                </div>
              )}
            </Card>

            {/* Account Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {memberSince}
                  </div>
                </div>
              </div>
            </Card>

            {/* Sign Out */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Session</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sign out of your account on this device
              </p>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  )
}
