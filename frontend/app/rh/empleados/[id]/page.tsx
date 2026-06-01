"use client";

import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";
import { use } from "react";

const EmpleadoDetalle = dynamic(() => import("@/components/EmpleadoDetalle"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EmpleadoDetalle id={id} />;
}
