
'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getUserProfile } from "@/lib/firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type UserProfile = {
  username: string;
  email: string;
  photoURL?: string;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        setLoading(true);
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile as UserProfile);
        }
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">User Profile</h2>
        <p className="text-muted-foreground">View and manage your profile details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          {loading ? (
            <CardHeader className="items-center text-center p-6">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40 mt-2" />
            </CardHeader>
          ) : profile ? (
            <CardHeader className="items-center text-center p-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={profile.photoURL || "https://placehold.co/100x100.png"} alt={profile.username} data-ai-hint="user portrait" />
                <AvatarFallback>{profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <CardTitle>{profile.username}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
          ) : (
             <CardHeader className="items-center text-center p-6">
              <p>User profile not found.</p>
            </CardHeader>
          )}
          <CardFooter className="p-4">
            <Button variant="outline" className="w-full" disabled>Edit Profile</Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Login Details</CardTitle>
            <CardDescription>Change your password here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" disabled />
            </div>
            <Button disabled>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
