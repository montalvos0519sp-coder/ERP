"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const RHDashboard = dynamic(() => import("@/components/RHDashboard"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() {
  return <RHDashboard />;
}
