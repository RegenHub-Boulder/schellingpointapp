'use client'

import * as React from 'react'
import { User, Mail, MapPin, Link as LinkIcon, Calendar, Upload } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ProfilePage() {
  const [isEditing, setIsEditing] = React.useState(false)
  const [profile, setProfile] = React.useState({
    name: 'Alice Chen',
    email: 'alice.chen@example.com',
    bio: 'Product designer passionate about decentralized governance and community-driven decision making.',
    location: 'San Francisco, CA',
    website: 'alicechen.design',
    joinedDate: 'January 2024',
    avatar: '',
  })

  const [editedProfile, setEditedProfile] = React.useState(profile)

  const handleSave = () => {
    setProfile(editedProfile)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  const user = {
    name: profile.name,
    avatar: profile.avatar,
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar user={user} onSignOut={() => console.log('Sign out')} />

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
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>

            {/* Profile Picture */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {isEditing && (
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 2MB.
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
                      value={editedProfile.name}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, name: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {profile.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, email: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {profile.email}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.bio}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, bio: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.location}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          location: e.target.value,
                        })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {profile.location}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Website</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.website}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, website: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      {profile.website}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Interests */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  'Decentralized Governance',
                  'DAOs',
                  'Quadratic Voting',
                  'Community Building',
                  'Web3',
                  'Product Design',
                ].map((interest) => (
                  <div
                    key={interest}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    {interest}
                  </div>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm">
                    + Add Interest
                  </Button>
                )}
              </div>
            </Card>

            {/* Account Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {profile.joinedDate}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Events participated</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sessions proposed</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total votes cast</span>
                  <span className="font-medium">342</span>
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-destructive/50">
              <h2 className="text-lg font-semibold mb-2 text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Irreversible and destructive actions
              </p>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  )
}
