"use client";

import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const EmpleadoForm = dynamic(() => import("@/components/EmpleadoForm"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() {
  return <EmpleadoForm mode="nuevo" />;
}
