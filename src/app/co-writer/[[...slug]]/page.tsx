import CoWriterPage from '@/components/co-writer/CoWriterPage';

interface CatchAllPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function CoWriterCatchAll({ params }: CatchAllPageProps) {
  const { slug } = await params;
  const sessionId = slug?.[0];

  return <CoWriterPage initialSessionId={sessionId} />;
}
