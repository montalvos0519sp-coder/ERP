"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionVacaciones = dynamic(() => import("@/components/GestionVacaciones"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() {
  return <GestionVacaciones />;
}
