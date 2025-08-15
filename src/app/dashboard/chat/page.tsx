import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

const messages = [
    { user: "Alex D.", avatar: "https://placehold.co/100x100.png", text: "Anyone have tips on staying focused when working from home?", time: "2:40 PM", isCurrentUser: false, hint: "man portrait" },
    { user: "You", avatar: "https://placehold.co/100x100.png", text: "I find the Pomodoro Technique really helpful! 25 minutes of work, 5 minute break.", time: "2:41 PM", isCurrentUser: true, hint: "woman portrait" },
    { user: "Samira K.", avatar: "https://placehold.co/100x100.png", text: "I second that! Also, noise-cancelling headphones are a game changer.", time: "2:42 PM", isCurrentUser: false, hint: "woman smiling" },
];

export default function ChatPage() {
    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 h-full">
            <div className="flex items-center justify-between space-y-2 pb-4">
                <h2 className="text-3xl font-bold tracking-tight">Public Chat</h2>
            </div>
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Community Discussion</CardTitle>
                    <CardDescription>Discuss ideas and get support from the community.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-6">
                        <div className="space-y-4 pr-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.isCurrentUser ? "justify-end" : ""}`}>
                                    {!msg.isCurrentUser && (
                                        <Avatar>
                                            <AvatarImage src={msg.avatar} alt={msg.user} data-ai-hint={msg.hint} />
                                            <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`flex flex-col ${msg.isCurrentUser ? "items-end" : "items-start"}`}>
                                        <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                            {!msg.isCurrentUser && <p className="font-semibold text-sm mb-1">{msg.user}</p>}
                                            <p>{msg.text}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground mt-1">{msg.time}</span>
                                    </div>
                                    {msg.isCurrentUser && (
                                        <Avatar>
                                            <AvatarImage src={msg.avatar} alt={msg.user} data-ai-hint={msg.hint} />
                                            <AvatarFallback>Y</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t">
                     <div className="flex items-center gap-2 w-full">
                        <Input placeholder="Type a message..." />
                        <Button variant="ghost" size="icon">
                            <Send className="h-5 w-5" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
