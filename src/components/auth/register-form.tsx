
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { signUp, signInWithGoogle } from "@/lib/firebase/auth";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be at most 20 characters."})
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function RegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setUsernameError(null);
    
    // Check if username is taken
    const res = await fetch(`/api/users?username=${values.username}`);
    const data = await res.json();
    if (data.exists) {
      setUsernameError("This username is already taken.");
      setIsLoading(false);
      return;
    }
    
    const { username, email, password } = values;
    const { error } = await signUp(username, email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: (error as Error).message,
      });
    }
    setIsLoading(false);
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
       toast({
        variant: "destructive",
        title: "Login Failed",
        description: (error as Error).message,
      });
    }
    setIsGoogleLoading(false);
  };

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <AppLogo className="w-16 h-16 mb-2 text-primary" />
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>
          Start your journey beyond theory today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="username">Username</Label>
                  <FormControl>
                    <Input id="username" placeholder="your_username" {...field} />
                  </FormControl>
                  <FormMessage>{usernameError}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email</Label>
                  <FormControl>
                    <Input id="email" type="email" placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="password">Password</Label>
                  <FormControl>
                    <Input id="password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <Separator />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
            <span className="bg-card px-2 text-sm text-muted-foreground">OR</span>
          </div>
        </div>
         <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.17-4.19 6.79v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.32z"/>
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
              <path fill="#FBBC05" d="M11.69 28.18c-.4-.73-.6-1.52-.6-2.34s.2-1.61.6-2.34v-5.7H4.34C2.85 20.48 2 23.13 2 25.84s.85 5.36 2.34 7.96l7.35-5.62z"/>
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 12.5l7.35 5.67c1.73-5.2 6.58-9.07 12.31-9.07z"/>
            </svg>
          )}
          Sign up with Google
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
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
