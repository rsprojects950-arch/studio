import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your app and account settings.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>App Font</Label>
                <p className="text-sm text-muted-foreground">Change the font used across the app.</p>
              </div>
              <Select defaultValue="inter">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Inter</SelectItem>
                  <SelectItem value="roboto">Roboto</SelectItem>
                  <SelectItem value="lora">Lora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable a darker color scheme.</p>
              </div>
              <Switch id="dark-mode" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
            <CardDescription>Recommended functions to improve your experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>Text Size</Label>
                <p className="text-sm text-muted-foreground">Adjust the size of text in the app.</p>
              </div>
              <div className="w-[180px] flex items-center gap-2">
                <span className="text-sm">A</span>
                <Slider defaultValue={[50]} max={100} step={1} />
                <span className="text-xl">A</span>
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label>High Contrast Mode</Label>
                <p className="text-sm text-muted-foreground">Improve visibility with higher contrast colors.</p>
              </div>
              <Switch id="high-contrast" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
