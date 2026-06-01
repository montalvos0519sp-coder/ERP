"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionEmpleados = dynamic(() => import("@/components/GestionEmpleados"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() {
  return <GestionEmpleados />;
}
