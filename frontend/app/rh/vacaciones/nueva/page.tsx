"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const VacacionForm = dynamic(() => import("@/components/VacacionForm"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function NuevaVacacionPage() { return <VacacionForm />; }
