import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Book, FileText, Video, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const resources = {
  tech: [
    { title: "React Docs", type: "Documentation", icon: FileText, image: "600x400", hint: "programming code" },
    { title: "Next.js Crash Course", type: "Video", icon: Video, image: "600x400", hint: "laptop desk" },
    { title: "The Pragmatic Programmer", type: "Book", icon: Book, image: "600x400", hint: "bookshelf library" },
  ],
  entrepreneur: [
    { title: "Y Combinator Library", type: "Online Resource", icon: FileText, image: "600x400", hint: "startup meeting" },
    { title: "How I Built This", type: "Podcast", icon: Video, image: "600x400", hint: "microphone recording" },
    { title: "Zero to One", type: "Book", icon: Book, image: "600x400", hint: "rocket launch" },
  ],
  selfHelp: [
    { title: "Atomic Habits", type: "Book", icon: Book, image: "600x400", hint: "journal writing" },
    { title: "Huberman Lab", type: "Podcast", icon: Video, image: "600x400", hint: "brain neuron" },
    { title: "Mindful Pondering", type: "Online Resource", icon: FileText, image: "600x400", hint: "meditation yoga" },
  ],
};

const ResourceCard = ({ title, type, icon: Icon, image, hint }: { title: string; type: string; icon: React.ElementType; image: string, hint: string }) => (
  <Card className="overflow-hidden">
    <CardHeader className="p-0">
      <div className="aspect-video bg-muted">
        <Image
          src={`https://placehold.co/${image}.png`}
          alt={title}
          width={600}
          height={400}
          className="object-cover w-full h-full"
          data-ai-hint={hint}
        />
      </div>
    </CardHeader>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{type}</CardDescription>
        </div>
      </div>
    </CardContent>
    <CardFooter className="p-4 pt-0">
      <Button variant="outline" className="w-full">
        View Resource <ExternalLink className="ml-2 h-4 w-4" />
      </Button>
    </CardFooter>
  </Card>
);

export default function ResourcesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Resources</h2>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search resources..." className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="tech" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tech">Tech</TabsTrigger>
          <TabsTrigger value="entrepreneur">Entrepreneur</TabsTrigger>
          <TabsTrigger value="selfHelp">Self Help</TabsTrigger>
        </TabsList>
        <TabsContent value="tech" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.tech.map(r => <ResourceCard key={r.title} {...r} />)}
        </TabsContent>
        <TabsContent value="entrepreneur" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.entrepreneur.map(r => <ResourceCard key={r.title} {...r} />)}
        </TabsContent>
        <TabsContent value="selfHelp" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.selfHelp.map(r => <ResourceCard key={r.title} {...r} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
