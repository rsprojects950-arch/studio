
'use client';

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { getUserProfile } from "@/lib/firebase/firestore";
import { updatePasswordAction } from "@/lib/firebase/actions";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type UserProfile = {
  username: string;
  email: string;
  photoURL?: string;
};

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your new password." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

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

  async function onSubmit(values: z.infer<typeof passwordFormSchema>) {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
        const result = await updatePasswordAction(
            user.uid,
            user.email!,
            values.currentPassword,
            values.newPassword
        );
        
        if (result.success) {
            toast({
                title: "Success!",
                description: "Your password has been updated.",
            });
            form.reset();
        } else {
            throw new Error(result.error || "An unknown error occurred.");
        }
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Password Update Failed",
            description: (error as Error).message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2 mb-6">
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

