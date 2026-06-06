import ChatPage from '@/components/chat/ChatPage';

interface CatchAllPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function ChatCatchAll({ params }: CatchAllPageProps) {
  const { slug } = await params;
  const sessionId = slug?.[0];

  return <ChatPage initialSessionId={sessionId} />;
}
