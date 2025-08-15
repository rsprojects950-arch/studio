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

export default function ProfilePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">User Profile</h2>
        <p className="text-muted-foreground">View and manage your profile details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="items-center text-center p-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="woman portrait" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <CardTitle>Jane Doe</CardTitle>
            <CardDescription>jane.doe@example.com</CardDescription>
          </CardHeader>
          <CardFooter className="p-4">
            <Button variant="outline" className="w-full">Edit Profile</Button>
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
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
