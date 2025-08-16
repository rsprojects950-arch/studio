
'use client';

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Upload } from "lucide-react";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { uploadProfilePhoto } from "@/lib/firebase/firestore";

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your new password." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export default function ProfilePage() {
  const { user, profile, reloadProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof passwordFormSchema>) {
    if (!user || !user.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to change your password.",
      });
      return;
    };
    setIsSubmitting(true);
    
    try {
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, values.newPassword);

        toast({
            title: "Success!",
            description: "Your password has been updated.",
        });
        form.reset();

    } catch (error) {
         let errorMessage = "An unknown error occurred.";
         if (error instanceof Error) {
            switch ((error as any).code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = "The current password you entered is incorrect. Please try again.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many attempts. Please try again later.";
                    break;
                default:
                    errorMessage = "An unexpected error occurred. Please try again.";
            }
         }
         toast({
            variant: "destructive",
            title: "Password Update Failed",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    try {
      await uploadProfilePhoto(user, selectedFile);
      await reloadProfile(); // Refresh profile data contextually
      toast({ title: "Success!", description: "Your profile photo has been updated." });
      setIsPhotoDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload your new profile photo. Please try again.",
      });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2 mb-6">
        <p className="text-muted-foreground">View and manage your profile details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          {!profile ? (
            <CardHeader className="items-center text-center p-6">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40 mt-2" />
            </CardHeader>
          ) : (
            <CardHeader className="items-center text-center p-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={profile.photoURL || undefined} alt={profile.username} data-ai-hint="user portrait" />
                <AvatarFallback>{profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <CardTitle>{profile.username}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
          )}
          <CardFooter className="p-4">
             <Dialog open={isPhotoDialogOpen} onOpenChange={(isOpen) => {
                if (!isUploading) {
                    setIsPhotoDialogOpen(isOpen);
                    if (!isOpen) {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                    }
                }
             }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">Change Photo</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Profile Photo</DialogTitle>
                        <DialogDescription>Select a new photo to use for your profile.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center justify-center">
                             <Avatar className="h-32 w-32">
                                <AvatarImage src={previewUrl || profile?.photoURL || undefined} alt="Profile preview" data-ai-hint="user portrait" />
                                <AvatarFallback>{profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                            </Avatar>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" className="hidden" />
                        <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4" /> 
                           Select Image
                        </Button>
                        {selectedFile && <p className="text-sm text-center text-muted-foreground">Selected: {selectedFile.name}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPhotoDialogOpen(false)} disabled={isUploading}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload & Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                      <div className="relative">
                        <FormControl>
                          <Input type={showCurrentPassword ? "text" : "password"} {...field} />
                        </FormControl>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                            {showCurrentPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </Button>
                      </div>
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
                      <div className="relative">
                        <FormControl>
                          <Input type={showNewPassword ? "text" : "password"} {...field} />
                        </FormControl>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </Button>
                      </div>
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
                      <div className="relative">
                        <FormControl>
                          <Input type={showConfirmPassword ? "text" : "password"} {...field} />
                        </FormControl>
                         <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </Button>
                      </div>
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
