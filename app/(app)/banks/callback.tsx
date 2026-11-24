import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingView } from '@/components/StateViews';

export default function BankCallbackScreen() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/banks');
  }, [router]);

  return <LoadingView />;
}
