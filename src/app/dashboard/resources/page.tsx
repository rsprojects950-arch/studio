
'use client';

import { useState, useMemo } from 'react';
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
import { Search, Book, FileText, Video, ExternalLink, Mic } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

const iconMap: { [key: string]: React.ElementType } = {
  Documentation: FileText,
  Video: Video,
  Book: Book,
  'Online Resource': FileText,
  Podcast: Mic,
};

const allResources = {
  tech: [
    { title: "React Docs", type: "Documentation", image: "600x400", hint: "programming code" },
    { title: "Next.js Crash Course", type: "Video", image: "600x400", hint: "laptop desk" },
    { title: "The Pragmatic Programmer", type: "Book", image: "600x400", hint: "bookshelf library" },
  ],
  entrepreneur: [
    { title: "Y Combinator Library", type: "Online Resource", image: "600x400", hint: "startup meeting" },
    { title: "How I Built This", type: "Podcast", image: "600x400", hint: "microphone recording" },
    { title: "Zero to One", type: "Book", image: "600x400", hint: "rocket launch" },
  ],
  selfHelp: [
    { title: "Atomic Habits", type: "Book", image: "600x400", hint: "journal writing" },
    { title: "Huberman Lab", type: "Podcast", image: "600x400", hint: "brain neuron" },
    { title: "Mindful Pondering", type: "Online Resource", image: "600x400", hint: "meditation yoga" },
  ],
};

const ResourceCard = ({ title, type, image, hint }: { title: string; type: string; image: string, hint: string }) => {
  const Icon = iconMap[type] || FileText;
  return (
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
};

const NoResults = () => (
    <div className="text-center text-muted-foreground col-span-full py-12">
        <p className="text-lg font-semibold">No results found</p>
        <p>Try adjusting your search or filters.</p>
    </div>
);


export default function ResourcesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('tech');

  const resourceTypes = useMemo(() => {
    const types = new Set(['All']);
    // @ts-ignore
    allResources[activeTab as keyof typeof allResources].forEach(r => types.add(r.type));
    return Array.from(types);
  }, [activeTab]);

  const filteredResources = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    
    const filterByCategory = (resources: any[]) => {
      return resources.filter(r => 
        r.title.toLowerCase().includes(lowercasedFilter) &&
        (activeFilter === 'All' || r.type === activeFilter)
      );
    }
    
    return {
      tech: filterByCategory(allResources.tech),
      entrepreneur: filterByCategory(allResources.entrepreneur),
      selfHelp: filterByCategory(allResources.selfHelp),
    };
  }, [searchTerm, activeFilter]);

  // Reset filter when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveFilter('All');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Resources</h2>
        <p className="text-muted-foreground">
          Explore curated books, videos, articles, and more to accelerate your growth.
        </p>
      </div>

      <Tabs defaultValue="tech" className="space-y-4" onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row justify-between gap-4">
            <TabsList>
                <TabsTrigger value="tech">Tech</TabsTrigger>
                <TabsTrigger value="entrepreneur">Entrepreneur</TabsTrigger>
                <TabsTrigger value="selfHelp">Self Help</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search in this category..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {resourceTypes.map(type => (
                <Button 
                    key={type} 
                    variant={activeFilter === type ? 'default' : 'outline'}
                    onClick={() => setActiveFilter(type)}
                    className="rounded-full"
                >
                    {type}
                </Button>
            ))}
        </div>

        <TabsContent value="tech" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.tech.length > 0 
            ? filteredResources.tech.map(r => <ResourceCard key={r.title} {...r} />)
            : <NoResults />}
        </TabsContent>
        <TabsContent value="entrepreneur" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.entrepreneur.length > 0
            ? filteredResources.entrepreneur.map(r => <ResourceCard key={r.title} {...r} />)
            : <NoResults />}
        </TabsContent>
        <TabsContent value="selfHelp" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.selfHelp.length > 0
            ? filteredResources.selfHelp.map(r => <ResourceCard key={r.title} {...r} />)
            : <NoResults />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

