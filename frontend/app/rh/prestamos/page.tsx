"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionPrestamos = dynamic(() => import("@/components/GestionPrestamos"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() {
  return <GestionPrestamos />;
}
