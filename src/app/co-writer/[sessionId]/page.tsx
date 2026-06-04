import CoWriterPage from '@/components/co-writer/CoWriterPage';

interface SessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return <CoWriterPage initialSessionId={sessionId} />;
}
