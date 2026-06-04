import ChatPage from '@/components/chat/ChatPage';

interface SessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return <ChatPage initialSessionId={sessionId} />;
}
