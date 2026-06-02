import { ChatView } from "@/components/ChatView";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ChatSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <ChatView sessionId={sessionId} />;
}
