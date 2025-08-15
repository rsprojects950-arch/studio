"use client";

import Link from "next/link";
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
import { AppLogo } from "@/components/icons/logo";

export function RegisterForm() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <AppLogo className="w-16 h-16 mb-2 text-primary" />
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>
          Start your journey beyond theory today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" asChild>
          <Link href="/dashboard">Create Account</Link>
        </Button>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/" className="underline text-primary">
            Login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
