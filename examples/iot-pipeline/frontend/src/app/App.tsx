import { DashboardLayout } from "@/features/layout/components/dashboard-layout";
import { useStreams } from "@/features/realtime/hooks/use-streams";

export function App() {
  useStreams();

  return <DashboardLayout />;
}
